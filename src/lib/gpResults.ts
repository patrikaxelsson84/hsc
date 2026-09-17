import { supabase } from './supabase';
import type { PlayerScore } from './scoring';

export interface GpResultRow {
    run_id: string;
    competition_name: string;
    competition_date: string | null;
    type_name: string;
    players: PlayerScore[];
    saved_at: string;
}

export async function pushGpResult(
    runId: string,
    competitionName: string,
    competitionDate: string | null,
    typeName: string,
    players: PlayerScore[]
): Promise<void> {
    await supabase.from('gp_results').upsert({
        run_id: runId,
        competition_name: competitionName,
        competition_date: competitionDate,
        type_name: typeName,
        players,
        saved_at: new Date().toISOString(),
    }, { onConflict: 'run_id' });
}

export async function fetchGpResults(): Promise<GpResultRow[]> {
    const { data } = await supabase
        .from('gp_results')
        .select('run_id, competition_name, competition_date, type_name, players, saved_at')
        .order('competition_date', { ascending: true });
    return (data ?? []) as GpResultRow[];
}
