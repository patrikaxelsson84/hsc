import { supabase } from './supabase'

const HEARTBEAT_MS  = 30_000  // ping every 30s
const ONLINE_MAX_MS = 90_000  // consider offline after 90s without ping

export async function setOnline(clubId: string): Promise<void> {
    await supabase
        .from('club_presence')
        .upsert({ club_id: clubId, last_seen: new Date().toISOString() }, { onConflict: 'club_id' })
}

export async function setOffline(clubId: string): Promise<void> {
    await supabase
        .from('club_presence')
        .delete()
        .eq('club_id', clubId)
}

export async function fetchOnlineClubs(): Promise<string[]> {
    const threshold = new Date(Date.now() - ONLINE_MAX_MS).toISOString()
    const { data } = await supabase
        .from('club_presence')
        .select('club_id')
        .gt('last_seen', threshold)
        .order('club_id')
    return (data ?? []).map((r: { club_id: string }) => r.club_id)
}

export function startHeartbeat(clubId: string): () => void {
    const id = setInterval(() => setOnline(clubId), HEARTBEAT_MS)
    return () => clearInterval(id)
}

export function subscribeOnlineClubs(onChange: () => void): () => void {
    const channel = supabase
        .channel('club-presence-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'club_presence' }, onChange)
        .subscribe()
    return () => { supabase.removeChannel(channel) }
}
