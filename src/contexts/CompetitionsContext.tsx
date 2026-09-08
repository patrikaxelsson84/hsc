import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { storageKey, seedCompetitions } from "../data/competitions";
import type { Competition } from "../data/competitions";

interface CompetitionsContextValue {
    competitions: Competition[];
    loading: boolean;
    saveCompetitions: (list: Competition[]) => Promise<void>;
    refresh: () => Promise<void>;
}

const CompetitionsContext = createContext<CompetitionsContextValue | null>(null);

function rowToComp(row: Record<string, unknown>): Competition {
    return {
        id:               row.id as string,
        name:             row.name as string,
        date:             row.date as string,
        organizer:        (row.organizer as string)  ?? "",
        location:         (row.location  as string)  ?? "",
        ranking:          (row.ranking   as boolean) ?? false,
        registrationOpen: (row.registration_open as boolean) ?? true,
        source:           ((row.source as string) ?? "manual") as "manual" | "svhkf",
    };
}

function compToRow(c: Competition): Record<string, unknown> {
    return {
        id:                c.id,
        name:              c.name,
        date:              c.date,
        organizer:         c.organizer,
        location:          c.location,
        ranking:           c.ranking,
        registration_open: c.registrationOpen,
        source:            c.source,
    };
}

function localOrSeed(): Competition[] {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw) as Competition[];
    } catch { /* empty */ }
    return seedCompetitions.map((c, i) => ({ ...c, id: `svhkf-${i}`, registrationOpen: true }));
}

export function CompetitionsProvider({ children }: { children: ReactNode }) {
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("competitions")
                .select("*")
                .order("date");
            if (error) throw error;

            if (data && data.length > 0) {
                setCompetitions(data.map(rowToComp));
            } else {
                // First run: migrate from localStorage or seed
                const initial = localOrSeed();
                await supabase.from("competitions").upsert(initial.map(compToRow));
                setCompetitions(initial);
                localStorage.removeItem(storageKey);
            }
        } catch {
            // Offline fallback: use localStorage cache
            setCompetitions(localOrSeed());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    const saveCompetitions = useCallback(async (list: Competition[]) => {
        const newIds = new Set(list.map((c) => c.id));
        const removed = competitions.map((c) => c.id).filter((id) => !newIds.has(id));
        await supabase.from("competitions").upsert(list.map(compToRow));
        if (removed.length > 0) {
            await supabase.from("competitions").delete().in("id", removed);
        }
        setCompetitions(list);
    }, [competitions]);

    return (
        <CompetitionsContext.Provider value={{ competitions, loading, saveCompetitions, refresh }}>
            {children}
        </CompetitionsContext.Provider>
    );
}

export function useCompetitions(): CompetitionsContextValue {
    const ctx = useContext(CompetitionsContext);
    if (!ctx) throw new Error("useCompetitions must be inside CompetitionsProvider");
    return ctx;
}
