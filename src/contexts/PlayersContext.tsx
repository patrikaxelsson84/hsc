import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { getFile, isConfigured } from "../lib/github";
import { samplePlayers } from "../data/sampleCompetition";
import type { PlayerScore } from "../lib/scoring";

const PLAYERS_PATH = import.meta.env.VITE_GITHUB_PLAYERS_PATH as string | undefined ?? "players.json";

interface StoredPlayer {
    id: string;
    name: string;
    club: string;
    classLevel: number;
    ageCategory: string;
}

function rowToPlayerScore(row: Record<string, unknown>): PlayerScore {
    return {
        id:          row.id as string,
        name:        row.name as string,
        club:        (row.club as string) ?? "",
        classLevel:  ((row.class_level as number) ?? 4) as PlayerScore["classLevel"],
        ageCategory: ((row.age_category as string) ?? "herr") as PlayerScore["ageCategory"],
        rounds:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        sevenMeters: 0,
    };
}

function playerToRow(p: PlayerScore): Record<string, unknown> {
    return {
        id:           p.id,
        name:         p.name,
        club:         p.club,
        class_level:  p.classLevel,
        age_category: p.ageCategory,
    };
}

interface PlayersContextValue {
    players: PlayerScore[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    savePlayers: (updated: PlayerScore[]) => Promise<void>;
}

const PlayersContext = createContext<PlayersContextValue | null>(null);

export function PlayersProvider({ children }: { children: ReactNode }) {
    const [players, setPlayers] = useState<PlayerScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbErr } = await supabase
                .from("players")
                .select("*")
                .order("name");
            if (dbErr) throw dbErr;

            if (data && data.length > 0) {
                setPlayers(data.map(rowToPlayerScore));
            } else if (isConfigured) {
                // First run: migrate from GitHub JSON
                const file = await getFile(PLAYERS_PATH);
                const stored = JSON.parse(file.content) as StoredPlayer[];
                if (stored.length > 0) {
                    await supabase.from("players").upsert(
                        stored.map((p) => ({
                            id:           p.id,
                            name:         p.name,
                            club:         p.club,
                            class_level:  p.classLevel,
                            age_category: p.ageCategory,
                        }))
                    );
                    setPlayers(stored.map((p) => ({
                        id:          p.id,
                        name:        p.name,
                        club:        p.club,
                        classLevel:  p.classLevel as PlayerScore["classLevel"],
                        ageCategory: p.ageCategory as PlayerScore["ageCategory"],
                        rounds:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        sevenMeters: 0,
                    })));
                } else {
                    setPlayers(samplePlayers);
                }
            } else {
                setPlayers(samplePlayers);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            setPlayers(samplePlayers);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    const savePlayers = useCallback(async (updated: PlayerScore[]) => {
        const currentIds = new Set(players.map((p) => p.id));
        const updatedIds = new Set(updated.map((p) => p.id));
        const removed    = [...currentIds].filter((id) => !updatedIds.has(id));

        if (removed.length > 0) {
            await supabase.from("players").delete().in("id", removed);
        }
        await supabase.from("players").upsert(updated.map(playerToRow));
        setPlayers(updated);
    }, [players]);

    return (
        <PlayersContext.Provider value={{ players, loading, error, refresh, savePlayers }}>
            {children}
        </PlayersContext.Provider>
    );
}

export function usePlayers(): PlayersContextValue {
    const ctx = useContext(PlayersContext);
    if (!ctx) throw new Error("usePlayers must be used inside PlayersProvider");
    return ctx;
}
