import { ArrowLeft, Building2, Mail, MapPin, Phone, Send, User } from "lucide-react";
import { useState, type FormEvent, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import LangSelect from "../components/LangSelect";
import { useLanguage } from "../lib/language";
import { supabase } from "../lib/supabase";

export default function ClubApplyPage() {
    const { t } = useLanguage();
    const [form, setForm] = useState({ club_name: "", contact_name: "", email: "", phone: "", city: "" });
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

    function set(field: string) {
        return (e: ChangeEvent<HTMLInputElement>) =>
            setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setStatus("sending");
        const { error } = await supabase.from("club_requests").insert({
            club_name:    form.club_name.trim(),
            contact_name: form.contact_name.trim(),
            email:        form.email.trim(),
            phone:        form.phone.trim() || null,
            city:         form.city.trim() || null,
        });
        setStatus(error ? "error" : "sent");
    }

    const header = (
        <header className="site-header">
            <Link className="brand" to="/" aria-label="HSC home">
                <span className="brand-mark">HSC</span>
                <span>{t.brand_subtitle}</span>
            </Link>
            <a className="svhkf-logo-link" href="https://www.svhkf.se/" target="_blank" rel="noopener noreferrer">
                <img className="svhkf-logo" src="/svhkf-logo.png" alt="Sv HKF" />
            </a>
            <LangSelect />
        </header>
    );

    if (status === "sent") {
        return (
            <main className="public-page">
                {header}
                <div className="club-login-shell">
                    <div className="club-login-card">
                        <div className="club-login-icon"><Send size={28} /></div>
                        <h1>{t.apply_sent_heading}</h1>
                        <p className="club-login-desc">{t.apply_sent_desc}</p>
                        <Link className="back-link club-login-back" to="/">
                            <ArrowLeft size={15} aria-hidden="true" />
                            {t.club_back}
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="public-page">
            {header}
            <div className="club-login-shell">
                <div className="club-login-card" style={{ maxWidth: 480 }}>
                    <div className="club-login-icon"><Building2 size={28} /></div>
                    <p className="eyebrow">{t.apply_eyebrow}</p>
                    <h1>{t.apply_heading}</h1>
                    <p className="club-login-desc">{t.apply_desc}</p>

                    <form className="club-login-form" onSubmit={handleSubmit}>
                        <label>
                            {t.apply_club_name}
                            <div className="club-login-field">
                                <Building2 size={16} aria-hidden="true" />
                                <input
                                    type="text"
                                    required
                                    value={form.club_name}
                                    onChange={set("club_name")}
                                    placeholder={t.apply_club_name_ph}
                                />
                            </div>
                        </label>
                        <label>
                            {t.apply_contact}
                            <div className="club-login-field">
                                <User size={16} aria-hidden="true" />
                                <input
                                    type="text"
                                    required
                                    value={form.contact_name}
                                    onChange={set("contact_name")}
                                    placeholder={t.apply_contact_ph}
                                />
                            </div>
                        </label>
                        <label>
                            {t.apply_email}
                            <div className="club-login-field">
                                <Mail size={16} aria-hidden="true" />
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={set("email")}
                                    placeholder="namn@exempel.se"
                                />
                            </div>
                        </label>
                        <label>
                            {t.apply_phone} <span style={{ color: "var(--muted)", fontSize: "0.8em" }}>{t.reg_optional}</span>
                            <div className="club-login-field">
                                <Phone size={16} aria-hidden="true" />
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={set("phone")}
                                    placeholder="070-000 00 00"
                                />
                            </div>
                        </label>
                        <label>
                            {t.apply_city} <span style={{ color: "var(--muted)", fontSize: "0.8em" }}>{t.reg_optional}</span>
                            <div className="club-login-field">
                                <MapPin size={16} aria-hidden="true" />
                                <input
                                    type="text"
                                    value={form.city}
                                    onChange={set("city")}
                                    placeholder={t.apply_city_ph}
                                />
                            </div>
                        </label>

                        {status === "error" && (
                            <p className="club-login-error">{t.apply_error}</p>
                        )}
                        <button
                            className="primary-action club-login-btn"
                            type="submit"
                            disabled={status === "sending"}
                        >
                            <Send size={18} aria-hidden="true" />
                            {status === "sending" ? "…" : t.apply_submit}
                        </button>
                    </form>

                    <Link className="back-link club-login-back" to="/">
                        <ArrowLeft size={15} aria-hidden="true" />
                        {t.club_back}
                    </Link>
                </div>
            </div>

            <footer className="site-footer">
                <div className="site-footer-inner">
                    <span className="site-footer-copy">
                        © {new Date().getFullYear()} hscontest.se. All rights reserved.
                    </span>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <Link className="site-footer-link" to="/privacy">{t.footer_privacy}</Link>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <Link className="site-footer-link" to="/club-apply">{t.apply_link}</Link>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <span className="site-footer-dev">Designed and developed by Patrik Axelsson.</span>
                </div>
            </footer>
        </main>
    );
}
