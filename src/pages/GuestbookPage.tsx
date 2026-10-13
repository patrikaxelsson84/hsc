import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/language";

const EDGE_URL  = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/moderate-guestbook`;
const ANON_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const BANNED = [
    "helvete","fan","jävla","jäkla","skit","skitsnack","hora","fitta","kuk",
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

const LANG_LOCALE: Record<string, string> = { sv: "sv-SE", en: "en-GB", pl: "pl-PL" };

function fmtDate(iso: string, locale: string) {
    return new Date(iso).toLocaleString(locale, {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function GuestbookPage() {
    const { t, lang } = useLanguage();
    const locale = LANG_LOCALE[lang] ?? "sv-SE";
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
            setFeedback(t.gb_err_words);
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
                reason = t.gb_err_moderation;
            }
        } catch {
            reason = t.gb_err_network;
        }

        if (!approved) {
            setStatus("rejected");
            setFeedback(reason || t.gb_err_rejected);
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
            setFeedback(t.gb_err_save);
            return;
        }

        setEntries((prev) => [data as Entry, ...prev]);
        setName("");
        setMessage("");
        setStatus("done");
        setFeedback(t.gb_success);
        setTimeout(() => { setStatus("idle"); setFeedback(""); }, 4000);
    }

    return (
        <div className="public-page guestbook-page">
            <nav className="guestbook-nav">
                <Link to="/" className="guestbook-back">
                    <ArrowLeft size={16} /> {t.gb_back}
                </Link>
            </nav>

            <header className="guestbook-header">
                <span className="guestbook-icon">
                    <MessageSquare size={28} />
                </span>
                <div>
                    <p className="eyebrow">{t.gb_eyebrow}</p>
                    <h1>{t.gb_heading}</h1>
                    <p className="guestbook-subtitle">{t.gb_subtitle}</p>
                </div>
            </header>

            {/* Form */}
            <section className="guestbook-form-section">
                <form ref={formRef} className="guestbook-form" onSubmit={handleSubmit}>
                    <div className="guestbook-form-row">
                        <label className="guestbook-label" htmlFor="gb-name">{t.gb_label_name} <span className="required">*</span></label>
                        <input
                            id="gb-name"
                            className="guestbook-input"
                            type="text"
                            required
                            maxLength={80}
                            placeholder={t.gb_ph_name}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={status === "checking" || status === "saving"}
                        />
                    </div>
                    <div className="guestbook-form-row">
                        <label className="guestbook-label" htmlFor="gb-message">{t.gb_label_message} <span className="required">*</span></label>
                        <textarea
                            id="gb-message"
                            className="guestbook-textarea"
                            required
                            maxLength={1000}
                            rows={4}
                            placeholder={t.gb_ph_message}
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
                        {status === "checking" ? t.gb_btn_checking : status === "saving" ? t.gb_btn_saving : <><Send size={15} /> {t.gb_btn_submit}</>}
                    </button>
                </form>
            </section>

            {/* Entries */}
            <section className="guestbook-entries">
                <h2 className="guestbook-entries-title">
                    {loading ? t.gb_loading : entries.length === 0 ? t.gb_empty : `${entries.length} ${t.gb_count}`}
                </h2>
                {!loading && entries.map((e) => (
                    <article key={e.id} className="guestbook-entry">
                        <div className="guestbook-entry-header">
                            <strong className="guestbook-entry-name">{e.name}</strong>
                            <time className="guestbook-entry-time">{fmtDate(e.created_at, locale)}</time>
                        </div>
                        <p className="guestbook-entry-message">{e.message}</p>
                    </article>
                ))}
            </section>
        </div>
    );
}
