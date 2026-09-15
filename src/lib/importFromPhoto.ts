export interface RecognizedScore {
    name: string;
    rounds: number[];
    bonusRounds: boolean[];
}

export async function extractScoresFromImage(
    imageDataUrl: string,
    apiKey: string,
): Promise<RecognizedScore[]> {
    const [header, base64] = imageDataUrl.split(",");
    const mediaType = (header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg") as
        "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const prompt = `This is a handwritten competition scorecard for a Swedish horseshoe throwing competition (hästskokastning).
Each player throws 5 horseshoes per round. Extract every player name, their round scores, and whether all 5 throws scored in each round (bonus).
Return ONLY valid JSON — no explanation, no markdown — exactly in this shape:
{"players": [{"name": "Player Name", "rounds": [n1, n2, n3, n4, n5], "bonusRounds": [b1, b2, b3, b4, b5]}]}
Rules:
- Each player must have exactly 5 score values and exactly 5 bonus booleans
- Use 0 for empty or illegible score cells
- bonusRounds[i] is true if there is a mark/checkmark/circle/B/bonus indicator for that round showing all 5 throws scored, otherwise false
- Include all visible player rows, even if partially filled`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
            model: "claude-sonnet-5",
            max_tokens: 2048,
            messages: [{
                role: "user",
                content: [
                    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
                    { type: "text", text: prompt },
                ],
            }],
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? `API-fel ${res.status}`);
    }

    const data = await res.json() as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Kunde inte tolka svaret från Claude.");

    const parsed = JSON.parse(jsonMatch[0]) as { players?: RecognizedScore[] };
    return parsed.players ?? [];
}
