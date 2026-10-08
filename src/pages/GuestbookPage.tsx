import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { supabase } from "../lib/supabase";

const EDGE_URL  = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/moderate-guestbook`;
const ANON_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const BANNED = [
    "helvete","fan","jävla","jäkla","skit","skitig","skitsnack","hora","fitta","kuk","pik",
    "knulla","knullad","bög","cp","mongo","satans","djävla","förbannad","dra åt helvete",
    "håll käften","käften","arsle","röv","rövhål","svin","din mamma","ditt as",
    "fuck","fucking","fucked","shit","bitch","asshole","bastard","cunt","cock","dick",
    "pussy","whore","nigger","nigga","faggot","retard",
];

function clientWordBlock(text: string): boolean {
    const lower = text.toLowerCase();
    return BANNED.some((w) => lower.includes(w));
}

interface Entry {
    id: string;
    name: string;
    message: string;
    created_at: string;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("sv-SE", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function GuestbookPage() {
    const [entries,   setEntries]   = useState<Entry[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [name,      setName]      = useState("");
    const [message,   setMessage]   = useState("");
    const [status,    setStatus]    = useState<"idle" | "checking" | "saving" | "done" | "rejected" | "error">("idle");
    const [feedback,  setFeedback]  = useState("");
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        supabase
            .from("guestbook_entries")
            .select("*")
            .order("created_at", { ascending: false })
            .then(({ data }) => {
                setEntries((data ?? []) as Entry[]);
                setLoading(false);
            });
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !message.trim()) return;

        setStatus("checking");
        setFeedback("");

        // Client-side fast check first
        if (clientWordBlock(name) || clientWordBlock(message)) {
            setStatus("rejected");
            setFeedback("Inlägget innehåller olämpliga ord och kan inte publiceras.");
            return;
        }

        // Moderate with Claude (edge function)
        let approved = false;
        let reason   = "";
        try {
            const resp = await fetch(EDGE_URL, {
                method:  "POST",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `Bearer ${ANON_KEY}`,
                },
                body: JSON.stringify({ name: name.trim(), message: message.trim() }),
            });
            if (resp.ok) {
                const result = await resp.json();
                approved = result.ok === true;
                reason   = result.reason ?? "";
            } else {
                reason = "Moderationstjänsten är tillfälligt otillgänglig. Försök igen.";
            }
        } catch {
            reason = "Kunde inte nå moderationstjänsten. Kontrollera din anslutning.";
        }

        if (!approved) {
            setStatus("rejected");
            setFeedback(reason || "Ditt inlägg kunde inte publiceras. Kontrollera att det inte innehåller olämpligt innehåll.");
            return;
        }

        setStatus("saving");
        const { data, error } = await supabase
            .from("guestbook_entries")
            .insert({ name: name.trim(), message: message.trim() })
            .select()
            .single();

        if (error || !data) {
            setStatus("error");
            setFeedback("Något gick fel. Försök igen.");
            return;
        }

        setEntries((prev) => [data as Entry, ...prev]);
        setName("");
        setMessage("");
        setStatus("done");
        setFeedback("Ditt inlägg har publicerats!");
        setTimeout(() => { setStatus("idle"); setFeedback(""); }, 4000);
    }

    return (
        <div className="public-page guestbook-page">
            <nav className="guestbook-nav">
                <Link to="/" className="guestbook-back">
                    <ArrowLeft size={16} /> Tillbaka till startsidan
                </Link>
            </nav>

            <header className="guestbook-header">
                <span className="guestbook-icon">
                    <MessageSquare size={28} />
                </span>
                <div>
                    <p className="eyebrow">GÄSTBOK</p>
                    <h1>Gästbok</h1>
                    <p className="guestbook-subtitle">Lämna en hälsning till HSC-gemenskapen.</p>
                </div>
            </header>

            {/* Form */}
            <section className="guestbook-form-section">
                <form ref={formRef} className="guestbook-form" onSubmit={handleSubmit}>
                    <div className="guestbook-form-row">
                        <label className="guestbook-label" htmlFor="gb-name">Ditt namn <span className="required">*</span></label>
                        <input
                            id="gb-name"
                            className="guestbook-input"
                            type="text"
                            required
                            maxLength={80}
                            placeholder="Skriv ditt namn"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={status === "checking" || status === "saving"}
                        />
                    </div>
                    <div className="guestbook-form-row">
                        <label className="guestbook-label" htmlFor="gb-message">Meddelande <span className="required">*</span></label>
                        <textarea
                            id="gb-message"
                            className="guestbook-textarea"
                            required
                            maxLength={1000}
                            rows={4}
                            placeholder="Skriv din hälsning här…"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={status === "checking" || status === "saving"}
                        />
                        <span className="guestbook-charcount">{message.length} / 1000</span>
                    </div>

                    {feedback && (
                        <p className={`guestbook-feedback ${status === "rejected" || status === "error" ? "error" : "success"}`}>
                            {feedback}
                        </p>
                    )}

                    <button
                        className="primary-action guestbook-submit"
                        type="submit"
                        disabled={status === "checking" || status === "saving" || !name.trim() || !message.trim()}
                    >
                        {status === "checking" ? "Granskar…" : status === "saving" ? "Sparar…" : <><Send size={15} /> Skicka inlägg</>}
                    </button>
                </form>
            </section>

            {/* Entries */}
            <section className="guestbook-entries">
                <h2 className="guestbook-entries-title">
                    {loading ? "Laddar…" : entries.length === 0 ? "Inga inlägg ännu — bli den första!" : `${entries.length} inlägg`}
                </h2>
                {!loading && entries.map((e) => (
                    <article key={e.id} className="guestbook-entry">
                        <div className="guestbook-entry-header">
                            <strong className="guestbook-entry-name">{e.name}</strong>
                            <time className="guestbook-entry-time">{fmtDate(e.created_at)}</time>
                        </div>
                        <p className="guestbook-entry-message">{e.message}</p>
                    </article>
                ))}
            </section>
        </div>
    );
}
