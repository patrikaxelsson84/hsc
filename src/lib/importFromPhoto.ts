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
