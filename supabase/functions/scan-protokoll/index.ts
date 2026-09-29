const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SCAN_TOKEN        = Deno.env.get("SCAN_TOKEN") ?? "";

const MAX_B64_CHARS  = 14_000_000; // ~10 MB decoded
const VALID_THROWS   = new Set([0, 3, 7, 20]);
const ALLOWED_TYPES  = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
};

function jsonResp(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...CORS },
    });
}

// ── Levenshtein distance ──────────────────────────────────────────────────────

function lev(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 0; i < a.length; i++) {
        let prev = row[0]++;
        for (let j = 0; j < b.length; j++) {
            const tmp = row[j + 1];
            row[j + 1] = a[i] === b[j] ? prev : 1 + Math.min(prev, row[j], row[j + 1]);
            prev = tmp;
        }
    }
    return row[b.length];
}

function normName(s: string): string {
    return s.toLowerCase().replace(/\s+/g, " ").trim();
}

interface Player { id: string; name: string }

function matchPlayer(recognized: string, players: Player[]): Player | null {
    const r = normName(recognized);
    // 1. Exact match
    let m = players.find(p => normName(p.name) === r);
    if (m) return m;

    // 2. Initial match: "M. Antic" → "Martin Antic"
    const rParts = r.split(" ");
    m = players.find(p => {
        const pParts = normName(p.name).split(" ");
        if (rParts.length !== pParts.length) return false;
        return rParts.every((rp, i) =>
            rp.endsWith(".") ? pParts[i].startsWith(rp.slice(0, -1)) : rp === pParts[i]
        );
    });
    if (m) return m;

    // 3. Levenshtein (threshold: up to 25% of name length, min 2)
    let best: Player | null = null;
    let bestDist = Infinity;
    for (const p of players) {
        const d = lev(r, normName(p.name));
        const threshold = Math.max(2, Math.floor(normName(p.name).length * 0.25));
        if (d < bestDist && d <= threshold) { bestDist = d; best = p; }
    }
    return best;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const DOMARPROTOKOLL_PROMPT = `This is a handwritten judge protocol (domarprotokoll) for a Swedish horseshoe throwing competition (hästskokastning).
Extract the round number (omgång), lane number (bana), and for each player row: their name, individual throw scores (kast), the written total (angiven_summa), and whether any values look unclear.

Return ONLY valid JSON — no explanation, no markdown — exactly:
{"omgang": <round number as integer>, "bana": <lane number as integer>, "players": [{"namn": "<name>", "kast": [<throw values>], "angiven_summa": <integer or null>, "osaker": <boolean>}]}

Rules:
- Valid throw values are 0, 3, 7 and 20 only. An empty box = 0.
- If a cell value is unclear or hard to read, set osaker: true for that player.
- A "B" or a mark outside a box is a bonus marker — ignore it completely.
- Ignore completely empty rows.
- Ignore any row where the name has a line drawn through it (struck through / crossed out) — do not include it in the output at all.
- angiven_summa is the total written on the right side of the row; set to null if absent.
- omgang is the round/omgång number written at the top or left margin.
- bana is the lane/bana number written at the top or left margin.`;

const RESULTATKORT_PROMPT = `This is a handwritten competition scorecard for a Swedish horseshoe throwing competition (hästskokastning).
Each player has 5 rounds. Each round contains 5 individual throw scores written in separate cells.
Extract every player name, the SUM of the 5 throws for each round, and whether all 5 throw scores in that round were greater than 0.
Return ONLY valid JSON — no explanation, no markdown — exactly in this shape:
{"players": [{"name": "Player Name", "rounds": [sum1, sum2, sum3, sum4, sum5], "bonusRounds": [b1, b2, b3, b4, b5]}]}
Rules:
- rounds[i] = sum of the 5 individual throw scores for that round (use 0 for empty or illegible cells)
- bonusRounds[i] = true if ALL 5 individual throw scores in that round are greater than 0, otherwise false
- Do NOT rely on any bonus marking on the card — derive it purely from the throw scores
- Each player must have exactly 5 round sums and exactly 5 bonus booleans
- Include all visible player rows, even if partially filled`;

// ── Claude API call ───────────────────────────────────────────────────────────

async function callClaude(image: string, mediaType: string, prompt: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key":          ANTHROPIC_API_KEY,
            "anthropic-version":  "2023-06-01",
            "content-type":       "application/json",
        },
        body: JSON.stringify({
            model:      "claude-sonnet-5",
            max_tokens: 2048,
            messages: [{
                role: "user",
                content: [
                    { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
                    { type: "text",  text: prompt },
                ],
            }],
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? `Claude API ${res.status}`);
    }
    const data = await res.json() as { content?: Array<{ type?: string; text?: string }> };
    console.log("Claude raw content types:", data.content?.map(b => b.type).join(","));
    const textBlock = data.content?.find(b => b.type === "text");
    const text = textBlock?.text ?? "";
    console.log("Claude text (first 300):", text.slice(0, 300));
    return text;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS });
    }

    if (req.method !== "POST") {
        return jsonResp({ error: "Method not allowed" }, 405);
    }

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    if (!SCAN_TOKEN || auth !== `Bearer ${SCAN_TOKEN}`) {
        return jsonResp({ error: "Unauthorized" }, 401);
    }

    let body: {
        format: "domarprotokoll" | "resultatkort";
        image: string;
        mediaType: string;
        registeredPlayers?: Player[];
    };
    try {
        body = await req.json();
    } catch {
        return jsonResp({ error: "Ogiltig JSON i förfrågan" }, 400);
    }

    const { format, image, mediaType, registeredPlayers = [] } = body;

    if (!ALLOWED_TYPES.has(mediaType)) {
        return jsonResp({ error: "Ogiltigt bildformat. Tillåtna: jpeg, png, webp, gif." }, 400);
    }
    if (!image || image.length > MAX_B64_CHARS) {
        return jsonResp({ error: "Bilden är för stor (max ~10 MB)." }, 400);
    }
    if (!ANTHROPIC_API_KEY) {
        return jsonResp({ error: "ANTHROPIC_API_KEY saknas på servern." }, 500);
    }

    try {
        if (format === "resultatkort") {
            // ── Old format for ClubPage ──────────────────────────────────────
            const text = await callClaude(image, mediaType, RESULTATKORT_PROMPT);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Kunde inte tolka svaret från Claude.");
            const parsed = JSON.parse(jsonMatch[0]) as {
                players?: { name: string; rounds: number[]; bonusRounds: boolean[] }[]
            };
            const players = (parsed.players ?? []).map(p => {
                const matched = matchPlayer(p.name, registeredPlayers);
                return { ...p, matchedId: matched?.id ?? null };
            });
            return jsonResp({ players });

        } else {
            // ── New domarprotokoll format for ScoringPage ────────────────────
            const text = await callClaude(image, mediaType, DOMARPROTOKOLL_PROMPT);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error(`Kunde inte tolka svaret från Claude. Svar: ${text.slice(0, 200)}`);

            const parsed = JSON.parse(jsonMatch[0]) as {
                omgang: number;
                bana: number;
                players: { namn: string; kast: number[]; angiven_summa: number | null; osaker: boolean }[]
            };

            const rows = (parsed.players ?? []).map(p => {
                const kast = (p.kast ?? []).map(Number);
                const beraknad   = kast.reduce((s, k) => s + k, 0);
                const ogiltig    = kast.some(k => !VALID_THROWS.has(k));
                const avvikelse  = p.angiven_summa !== null && p.angiven_summa !== beraknad;
                const matched    = matchPlayer(p.namn, registeredPlayers);

                let flaggorsak: string | null = null;
                if (p.osaker)    flaggorsak = "Oklar handstil";
                else if (ogiltig)  flaggorsak = `Ogiltigt kastvärde (${kast.filter(k => !VALID_THROWS.has(k)).join(", ")})`;
                else if (avvikelse) flaggorsak = `Angiven ${p.angiven_summa}, beräknad ${beraknad}`;
                else if (!matched)  flaggorsak = "Namn ej matchat i tävlingen";

                return {
                    namn:          p.namn,
                    kast,
                    angiven_summa: p.angiven_summa ?? null,
                    osaker:        p.osaker ?? false,
                    beraknad_summa: beraknad,
                    avvikelse,
                    ogiltig_kast:  ogiltig,
                    matchad_id:    matched?.id   ?? null,
                    matchat_namn:  matched?.name ?? null,
                    flaggad:       ogiltig || avvikelse || !matched || (p.osaker ?? false),
                    flaggorsak,
                };
            });

            return jsonResp({
                omgang: Number(parsed.omgang ?? 1),
                bana:   Number(parsed.bana   ?? 1),
                players: rows,
            });
        }

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonResp({ error: msg }, 500);
    }
});
