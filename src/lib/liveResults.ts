import { supabase } from './supabase';
import type { PlayerScore, TeamAssignment } from './scoring';

export interface LiveContestData {
    active: { runId: string; contestName: string; typeName: string; paused: boolean };
    players: PlayerScore[];
    teamAssignments: TeamAssignment[];
}

export async function pushLiveResults(
    runId: string,
    contestName: string,
    typeName: string,
    players: PlayerScore[],
    teamAssignments: TeamAssignment[],
    paused = false,
): Promise<void> {
    await supabase.from('live_contest').upsert({
        id: 'current',
        run_id: runId,
        contest_name: contestName,
        type_name: typeName,
        players,
        team_assignments: teamAssignments,
        paused,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
}

export async function setPauseLiveResults(paused: boolean): Promise<void> {
    await supabase.from('live_contest').update({ paused }).eq('id', 'current');
}

export async function clearLiveResults(): Promise<void> {
    await supabase.from('live_contest').delete().eq('id', 'current');
}

export async function fetchLiveResults(): Promise<LiveContestData | null> {
    const { data } = await supabase
        .from('live_contest')
        .select('*')
        .eq('id', 'current')
        .single();
    if (!data) return null;
    return {
        active: { runId: data.run_id, contestName: data.contest_name, typeName: data.type_name, paused: data.paused ?? false },
        players: data.players as PlayerScore[],
        teamAssignments: data.team_assignments as TeamAssignment[],
    };
}
