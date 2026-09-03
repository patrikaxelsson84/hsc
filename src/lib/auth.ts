import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

const SALT_ROUNDS = 10

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

export async function addClub(name: string, password = '123'): Promise<void> {
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
    const hashed = await hashPassword('123')
    const rows = knownClubs.map((c) => ({ id: c, type: 'club', password: hashed }))
    await supabase
        .from('credentials')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
}
