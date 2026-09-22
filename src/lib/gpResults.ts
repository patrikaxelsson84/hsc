import { supabase } from './supabase';
import type { PlayerScore } from './scoring';

export interface GpResultRow {
    run_id: string;
    competition_name: string;
    competition_date: string | null;
    type_name: string;
    players: PlayerScore[];
    saved_at: string;
    is_sm: boolean;
}

export async function pushGpResult(
    runId: string,
    competitionName: string,
    competitionDate: string | null,
    typeName: string,
    players: PlayerScore[],
    isSm = false
): Promise<void> {
    await supabase.from('gp_results').upsert({
        run_id: runId,
        competition_name: competitionName,
        competition_date: competitionDate,
        type_name: typeName,
        players,
        is_sm: isSm,
        saved_at: new Date().toISOString(),
    }, { onConflict: 'run_id' });
}

export async function fetchGpResults(): Promise<GpResultRow[]> {
    const { data } = await supabase
        .from('gp_results')
        .select('run_id, competition_name, competition_date, type_name, players, saved_at, is_sm')
        .order('competition_date', { ascending: true });
    return ((data ?? []) as (Omit<GpResultRow, 'is_sm'> & { is_sm?: boolean })[])
        .map((r) => ({ ...r, is_sm: r.is_sm ?? false }));
}
