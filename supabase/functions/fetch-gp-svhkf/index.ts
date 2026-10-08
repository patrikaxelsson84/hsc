const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...CORS },
    });
}

function stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").replace(/&amp;/g, "&").replace(/&ouml;/g, "ö").replace(/&aring;/g, "å").replace(/&auml;/g, "ä").replace(/\s+/g, " ").trim();
}

interface SvhkfPlayer {
    place:      number;
    name:       string;
    club:       string;
    gpPoints:   number;
    classLevel: number;
}

async function fetchKlass(n: number): Promise<{ players: SvhkfPlayer[]; season: string }> {
    const url = `https://www.svhkf.se/sweden%20grand%20prix/klass${n}.php`;
    const resp = await fetch(url, { headers: { "Accept-Charset": "utf-8" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for klass${n}`);
    const html = await resp.text();

    // Extract season from first header row, e.g. "Klass 1 2026/2027"
    const seasonMatch = html.match(/Klass\s+\d+\s+([\d]{4}\/[\d]{4})/);
    const season = seasonMatch?.[1] ?? "";

    // Extract all <tr>...</tr> blocks
    const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const tdPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

    const players: SvhkfPlayer[] = [];

    for (const trMatch of html.matchAll(trPattern)) {
        const cells: string[] = [];
        for (const tdMatch of trMatch[1].matchAll(tdPattern)) {
            cells.push(stripTags(tdMatch[1]));
        }
        if (cells.length < 4) continue;
        const place = parseInt(cells[0]);
        if (!Number.isFinite(place) || place < 1) continue;
        const gpPoints = parseInt(cells[3]);
        if (!Number.isFinite(gpPoints)) continue;
        players.push({
            place,
            name:       cells[1],
            club:       cells[2],
            gpPoints,
            classLevel: n,
        });
    }

    return { players, season };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
        const results = await Promise.all([1, 2, 3, 4].map(fetchKlass));
        const season  = results.find((r) => r.season)?.season ?? "";
        const players = results.flatMap((r) => r.players);
        return json({ season, players });
    } catch (err) {
        return json({ error: String(err) }, 502);
    }
});
