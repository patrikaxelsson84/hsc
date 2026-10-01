import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

const SALT_ROUNDS     = 10
const MAX_ATTEMPTS    = 6
const LOCKOUT_MINUTES = 60

// ── Lockout types ─────────────────────────────────────────────────────────────

type FailedLogin =
    | { ok: false; locked: false; attemptsLeft: number }
    | { ok: false; locked: true;  minutesLeft: number }

export type LoginResult     = { ok: true }              | FailedLogin
export type ClubLoginResult = { ok: true; clubId: string } | FailedLogin

export type LockoutRecord = {
    id: string
    failed_attempts: number
    locked_until: string | null
    updated_at: string
}

// ── Lockout helpers ───────────────────────────────────────────────────────────

async function fetchLockRow(id: string) {
    const { data } = await supabase
        .from('login_lockouts')
        .select('failed_attempts, locked_until')
        .eq('id', id)
        .maybeSingle()
    return data as { failed_attempts: number; locked_until: string | null } | null
}

function activeLock(row: { locked_until: string | null } | null): { locked: boolean; minutesLeft: number } {
    if (!row?.locked_until) return { locked: false, minutesLeft: 0 }
    const until = new Date(row.locked_until)
    if (until <= new Date()) return { locked: false, minutesLeft: 0 }
    return { locked: true, minutesLeft: Math.ceil((until.getTime() - Date.now()) / 60_000) }
}

async function recordFailure(id: string, row: { failed_attempts: number } | null): Promise<FailedLogin> {
    const attempts     = (row?.failed_attempts ?? 0) + 1
    const locked_until = attempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null
    await supabase.from('login_lockouts').upsert(
        { id, failed_attempts: attempts, locked_until, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
    )
    if (locked_until) return { ok: false, locked: true, minutesLeft: LOCKOUT_MINUTES }
    return { ok: false, locked: false, attemptsLeft: MAX_ATTEMPTS - attempts }
}

async function clearAttempts(id: string): Promise<void> {
    await supabase.from('login_lockouts').upsert(
        { id, failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
    )
}

function isBcryptHash(s: string): boolean {
    return s.startsWith('$2b$') || s.startsWith('$2a$')
}

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
}

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
    if (isBcryptHash(stored)) return bcrypt.compare(plain, stored)
    // Legacy plain-text passwords — compare directly (migration path)
    return plain === stored
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function checkAdminPassword(password: string): Promise<boolean> {
    const { data } = await supabase
        .from('credentials')
        .select('password')
        .eq('id', 'admin')
        .single()
    if (!data) return false
    return verifyPassword(password, data.password)
}

export async function loginAdmin(username: string, password: string): Promise<LoginResult> {
    const row = await fetchLockRow('admin')
    const { locked, minutesLeft } = activeLock(row)
    if (locked) return { ok: false, locked: true, minutesLeft }

    const { data } = await supabase
        .from('credentials')
        .select('password, username')
        .eq('id', 'admin')
        .single()

    // If a username is stored, both must match; if none stored yet, only password is checked
    const usernameOk = !data?.username || data.username === username
    const valid = !!(data && usernameOk && await verifyPassword(password, data.password))

    if (valid) { await clearAttempts('admin'); return { ok: true } }
    return recordFailure('admin', row)
}

export async function setAdminUsername(username: string): Promise<void> {
    await supabase
        .from('credentials')
        .update({ username: username.trim() })
        .eq('id', 'admin')
}

export async function setAdminPassword(password: string): Promise<void> {
    const hashed = await hashPassword(password)
    await supabase
        .from('credentials')
        .upsert({ id: 'admin', type: 'admin', password: hashed })
}

// ── Clubs ─────────────────────────────────────────────────────────────────────

export async function checkClubPassword(club: string, password: string): Promise<boolean> {
    const { data } = await supabase
        .from('credentials')
        .select('password')
        .eq('id', club)
        .eq('type', 'club')
        .single()
    if (!data) return false
    return verifyPassword(password, data.password)
}

export async function loginClub(username: string, password: string): Promise<ClubLoginResult> {
    const input = username.trim()

    // 1. Match by username field (case-insensitive)
    const { data: byUsername } = await supabase
        .from('credentials')
        .select('id, password')
        .ilike('username', input)
        .eq('type', 'club')
        .maybeSingle()

    // 2. Fallback: match by club name / id (backwards-compatible for clubs without a username)
    const { data: byId } = !byUsername ? await supabase
        .from('credentials')
        .select('id, password')
        .ilike('id', input)
        .eq('type', 'club')
        .maybeSingle() : { data: null }

    const match = byUsername ?? byId
    const lockId = match?.id ?? input.toLowerCase()

    const row = await fetchLockRow(lockId)
    const { locked, minutesLeft } = activeLock(row)
    if (locked) return { ok: false, locked: true, minutesLeft }

    const valid = !!(match && await verifyPassword(password, match.password))

    if (valid) { await clearAttempts(lockId); return { ok: true, clubId: match!.id } }
    return recordFailure(lockId, row)
}

// ── Admin lockout management ───────────────────────────────────────────────────

export async function getActiveLockouts(): Promise<LockoutRecord[]> {
    const { data } = await supabase
        .from('login_lockouts')
        .select('id, failed_attempts, locked_until, updated_at')
        .gt('locked_until', new Date().toISOString())
        .order('updated_at', { ascending: false })
    return (data ?? []) as LockoutRecord[]
}

export async function unlockAccount(id: string): Promise<void> {
    await clearAttempts(id)
}

export async function setClubPassword(club: string, password: string): Promise<void> {
    const hashed = await hashPassword(password)
    await supabase
        .from('credentials')
        .upsert({ id: club, type: 'club', password: hashed })
}

export async function listClubs(): Promise<string[]> {
    const { data } = await supabase
        .from('credentials')
        .select('id')
        .eq('type', 'club')
        .order('id')
    return (data ?? []).map((r: { id: string }) => r.id)
}

export type ClubInfo = { id: string; username: string | null }

export async function listClubsWithInfo(): Promise<ClubInfo[]> {
    const { data } = await supabase
        .from('credentials')
        .select('id, username')
        .eq('type', 'club')
        .order('id')
    return (data ?? []) as ClubInfo[]
}

export async function setClubUsername(clubId: string, username: string): Promise<void> {
    await supabase
        .from('credentials')
        .update({ username: username.trim() || null })
        .eq('id', clubId)
        .eq('type', 'club')
}

export async function addClub(name: string, password = '1337'): Promise<void> {
    const hashed = await hashPassword(password)
    await supabase
        .from('credentials')
        .upsert({ id: name, type: 'club', password: hashed }, { onConflict: 'id', ignoreDuplicates: true })
}

export async function removeClub(name: string): Promise<void> {
    await supabase
        .from('credentials')
        .delete()
        .eq('id', name)
        .eq('type', 'club')
}

export async function ensureClubsExist(knownClubs: string[]): Promise<void> {
    if (knownClubs.length === 0) return
    const hashed = await hashPassword('1337')
    const rows = knownClubs.map((c) => ({ id: c, type: 'club', password: hashed }))
    await supabase
        .from('credentials')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
}
