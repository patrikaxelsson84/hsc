const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

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

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

    let name: string, message: string;
    try {
        ({ name, message } = await req.json());
    } catch {
        return jsonResp({ error: "Invalid JSON" }, 400);
    }

    if (!name?.trim() || !message?.trim()) {
        return jsonResp({ ok: false, reason: "Namn och meddelande krävs." });
    }
    if (message.length > 1000) {
        return jsonResp({ ok: false, reason: "Meddelandet är för långt (max 1000 tecken)." });
    }

    if (!ANTHROPIC_API_KEY) return jsonResp({ error: "No API key" }, 500);

    const prompt = `Du är en moderator för en gästbok på en svensk hästskokastnings-sajt. Bedöm om följande inlägg är lämpligt att publicera.

Namn: ${name}
Meddelande: ${message}

Regler — AVVISA om inlägget innehåller:
- Svärord eller grova ord på svenska, engelska eller annat språk
- Mobbning, hat, hot, nedsättande kommentarer om personer eller grupper
- Sexuellt innehåll
- Spam, reklam eller upprepade meningslösa tecken
- Personuppgifter som telefonnummer, e-postadresser eller adresser

GODKÄNN allt annat: hälsningar, beröm, kommentarer om tävlingar, konstruktiv kritik.

Svara ENDAST med ett JSON-objekt: {"ok": true} eller {"ok": false, "reason": "<kort förklaring på svenska>"}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key":         ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type":      "application/json",
        },
        body: JSON.stringify({
            model:      "claude-haiku-4-5-20251001",
            max_tokens: 100,
            messages:   [{ role: "user", content: prompt }],
        }),
    });

    if (!resp.ok) return jsonResp({ error: "Moderation service unavailable" }, 502);

    const data = await resp.json();
    const raw  = data.content?.[0]?.text ?? "";

    try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("no json");
        const result = JSON.parse(match[0]);
        return jsonResp(result);
    } catch {
        // If parsing fails, default to approved so a parsing glitch doesn't block legitimate posts
        return jsonResp({ ok: true });
    }
});
