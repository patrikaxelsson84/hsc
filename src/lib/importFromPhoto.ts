export interface RecognizedScore {
    name: string;
    rounds: number[];
}

export async function extractScoresFromImage(
    imageDataUrl: string,
    apiKey: string,
): Promise<RecognizedScore[]> {
    const [header, base64] = imageDataUrl.split(",");
    const mediaType = (header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg") as
        "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const prompt = `This is a handwritten competition scorecard (bowling or similar).
Extract every player name and their round scores from columns labeled 1, 2, 3, 4, 5.
Return ONLY valid JSON — no explanation, no markdown — exactly in this shape:
{"players": [{"name": "Player Name", "rounds": [n1, n2, n3, n4, n5]}]}
Rules:
- Each player must have exactly 5 score values
- Use 0 for empty or illegible cells
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
