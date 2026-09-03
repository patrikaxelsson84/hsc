import { supabase } from './supabase'

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function checkAdminPassword(password: string): Promise<boolean> {
    const { data } = await supabase
        .from('credentials')
        .select('password')
        .eq('id', 'admin')
        .single()
    return (data?.password ?? 'admin') === password
}

export async function setAdminPassword(password: string): Promise<void> {
    await supabase
        .from('credentials')
        .upsert({ id: 'admin', type: 'admin', password })
}

export async function getAdminPassword(): Promise<string> {
    const { data } = await supabase
        .from('credentials')
        .select('password')
        .eq('id', 'admin')
        .single()
    return data?.password ?? 'admin'
}

// ── Clubs ─────────────────────────────────────────────────────────────────────

export async function checkClubPassword(club: string, password: string): Promise<boolean> {
    const { data } = await supabase
        .from('credentials')
        .select('password')
        .eq('id', club)
        .eq('type', 'club')
        .single()
    return (data?.password ?? '123') === password
}

export async function setClubPassword(club: string, password: string): Promise<void> {
    await supabase
        .from('credentials')
        .upsert({ id: club, type: 'club', password })
}

export async function listClubs(): Promise<string[]> {
    const { data } = await supabase
        .from('credentials')
        .select('id')
        .eq('type', 'club')
        .order('id')
    return (data ?? []).map((r: { id: string }) => r.id)
}

export async function listClubsWithPasswords(): Promise<{ id: string; password: string }[]> {
    const { data } = await supabase
        .from('credentials')
        .select('id, password')
        .eq('type', 'club')
        .order('id')
    return data ?? []
}

export async function addClub(name: string, password = '123'): Promise<void> {
    await supabase
        .from('credentials')
        .upsert({ id: name, type: 'club', password }, { onConflict: 'id', ignoreDuplicates: true })
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
    const rows = knownClubs.map((c) => ({ id: c, type: 'club', password: '123' }))
    await supabase
        .from('credentials')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
}
