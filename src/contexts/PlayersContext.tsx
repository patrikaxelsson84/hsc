import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getFile, isConfigured, putFile } from "../lib/github";
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

function toPlayerScore(p: StoredPlayer): PlayerScore {
    return {
        id: p.id,
        name: p.name,
        club: p.club,
        classLevel: p.classLevel as PlayerScore["classLevel"],
        ageCategory: p.ageCategory as PlayerScore["ageCategory"],
        rounds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        sevenMeters: 0,
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
    const [players, setPlayers] = useState<PlayerScore[]>(
        isConfigured ? [] : samplePlayers,
    );
    const [loading, setLoading] = useState(isConfigured);
    const [error, setError]     = useState<string | null>(null);
    const shaRef                = useRef<string | undefined>(undefined);

    const refresh = useCallback(async () => {
        if (!isConfigured) return;
        setLoading(true);
        setError(null);
        try {
            const file = await getFile(PLAYERS_PATH);
            shaRef.current = file.sha;
            const stored = JSON.parse(file.content) as StoredPlayer[];
            setPlayers(stored.map(toPlayerScore));
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
        if (!isConfigured) return;
        const stored: StoredPlayer[] = updated.map((p) => ({
            id: p.id,
            name: p.name,
            club: p.club,
            classLevel: p.classLevel,
            ageCategory: p.ageCategory,
        }));
        const content = JSON.stringify(stored, null, 2);
        await putFile(PLAYERS_PATH, content, shaRef.current, "update players");
        shaRef.current = undefined;
        await refresh();
    }, [refresh]);

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
