import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function parseSvhkfDate(raw: string): string {
    const rangeMatch = raw.match(/^(\d+)(?:-\d+)?\/(\d+)\s+(\d{4})$/);
    if (rangeMatch) {
        const [, day, month, year] = rangeMatch;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    const yearOnly = raw.match(/^(\d{4})$/);
    if (yearOnly) return `${yearOnly[1]}-01-01`;
    return "";
}

function parseTd(html: string): string {
    return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
}

interface CalendarRow {
    name: string;
    date: string;
    organizer: string;
    location: string;
    ranking: boolean;
}

async function fetchCalendar(): Promise<CalendarRow[]> {
    const res = await fetch("https://www.svhkf.se/kalender/", {
        headers: { "User-Agent": "hscontest.se-sync/1.0" },
    });
    if (!res.ok) throw new Error(`svhkf fetch failed: ${res.status}`);
    const html = await res.text();

    const results: CalendarRow[] = [];
    const trPat = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trPat.exec(html)) !== null) {
        const tds: string[] = [];
        const tdPat = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch;
        while ((tdMatch = tdPat.exec(trMatch[1])) !== null) {
            tds.push(parseTd(tdMatch[1]));
        }
        if (tds.length < 2) continue;
        const date = parseSvhkfDate(tds[0] ?? "");
        const name = tds[1] ?? "";
        if (!date || !name) continue;
        results.push({
            name,
            date,
            organizer: tds[2] ?? "",
            location: tds[3] ?? "",
            ranking: (tds[4] ?? "").toLowerCase().startsWith("ja"),
        });
    }
    return results;
}

Deno.serve(async (req: Request) => {
    // Accept service role key (from cron) or any POST from Supabase scheduler
    const auth = req.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });

        const fetched = await fetchCalendar();

        const { data: existing, error: fetchErr } = await supabase
            .from("competitions")
            .select("id, name, date, organizer, location, ranking")
            .eq("source", "svhkf");

        if (fetchErr) throw fetchErr;

        const byName = new Map((existing ?? []).map((c) => [c.name.toLowerCase(), c]));

        let added = 0;
        let updated = 0;

        for (const row of fetched) {
            const cur = byName.get(row.name.toLowerCase());
            if (cur) {
                if (
                    cur.date !== row.date ||
                    cur.organizer !== row.organizer ||
                    cur.location !== row.location ||
                    cur.ranking !== row.ranking
                ) {
                    const { error } = await supabase
                        .from("competitions")
                        .update({ date: row.date, organizer: row.organizer, location: row.location, ranking: row.ranking })
                        .eq("id", cur.id);
                    if (error) throw error;
                    updated++;
                }
            } else {
                const { error } = await supabase.from("competitions").insert({
                    id: `svhkf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    name: row.name,
                    date: row.date,
                    organizer: row.organizer,
                    location: row.location,
                    ranking: row.ranking,
                    registration_open: false,
                    source: "svhkf",
                    country: "SE",
                    is_sm: false,
                });
                if (error) throw error;
                added++;
            }
        }

        return new Response(
            JSON.stringify({ ok: true, fetched: fetched.length, added, updated }),
            { headers: { "Content-Type": "application/json" } },
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
