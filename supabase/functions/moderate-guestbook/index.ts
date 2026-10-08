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

// Fast word-list check — catches obvious cases without an API call
const BANNED_WORDS = [
    // Swedish
    "helvete","fan","jävla","jäkla","skit","skitig","skitsnack","hora","fitta","kuk","pik",
    "knulla","knullad","bög","cp","mongo","idiot","idioter","dum i huvudet","asså va fan",
    "satans","djävul","djävla","förbannad","förjävlig","dra åt helvete","håll käften","käften",
    "arsle","röv","rövhål","svin","din mamma","ditt as",
    // English
    "fuck","fucking","fucked","shit","bitch","asshole","bastard","cunt","cock","dick",
    "pussy","whore","nigger","nigga","faggot","retard","moron","idiot","stupid",
    "hate you","kill yourself","kys","go die",
];

function wordListBlock(text: string): boolean {
    const lower = text.toLowerCase().replace(/[^a-zåäö0-9\s]/g, " ");
    return BANNED_WORDS.some((w) => {
        const re = new RegExp(`(^|\\s)${w.replace(/ /g, "\\s+")}(\\s|$)`);
        return re.test(lower) || lower.includes(w);
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

    // Fast path: block obvious swear words immediately
    if (wordListBlock(name) || wordListBlock(message)) {
        return jsonResp({ ok: false, reason: "Inlägget innehåller olämpliga ord och kan inte publiceras." });
    }

    if (!ANTHROPIC_API_KEY) return jsonResp({ error: "No API key" }, 500);

    const prompt = `Du är en strikt moderator för en gästbok på en svensk hästskokastnings-sajt för familjer och barn.

Namn: ${name}
Meddelande: ${message}

AVVISA direkt om inlägget innehåller NÅGOT av följande:
- Svärord, könsord eller grova uttryck på VILKET SPRÅK SOM HELST (även milda svärord som "helvete", "fan", "jävla", "shit", "damn", "crap" etc.)
- Mobbning, hån, nedsättande kommentarer om personer eller grupper
- Hot eller aggressivt språk
- Sexuellt innehåll
- Spam, reklam, nonsens-text
- Personuppgifter (telefon, e-post, adress)

GODKÄNN: hälsningar, beröm, tävlingskommentarer, positiv feedback, tack-hälsningar, konstruktiv och respektfull kritik.

Tveka inte — vid minsta tvekan på lämplighet, AVVISA.

Svara ENDAST med JSON: {"ok": true} eller {"ok": false, "reason": "<förklaring på svenska, max 15 ord>"}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key":         ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type":      "application/json",
        },
        body: JSON.stringify({
            model:      "claude-haiku-4-5-20251001",
            max_tokens: 80,
            messages:   [{ role: "user", content: prompt }],
        }),
    });

    if (!resp.ok) {
        // Moderation service down — reject to be safe
        return jsonResp({ ok: false, reason: "Moderationstjänsten är tillfälligt otillgänglig. Försök igen om en stund." });
    }

    const data = await resp.json();
    const raw  = data.content?.[0]?.text ?? "";

    try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("no json");
        const result = JSON.parse(match[0]);
        return jsonResp(result);
    } catch {
        // Parsing failed — reject to be safe
        return jsonResp({ ok: false, reason: "Inlägget kunde inte granskas. Försök igen." });
    }
});
