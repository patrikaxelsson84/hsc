import { ArrowLeft, Check, Send } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { samplePlayers } from "../data/sampleCompetition";
import LangSelect from "../components/LangSelect";
import { useLanguage } from "../lib/language";

const clubOptions = [...new Set(samplePlayers.map((p) => p.club).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
);

type RegistrationStatus = "idle" | "submitted";

export default function RegistrationPage() {
    const [status, setStatus] = useState<RegistrationStatus>("idle");
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith("/admin");
    const { t } = useLanguage();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const entry = Object.fromEntries(formData.entries());
        const existing = JSON.parse(localStorage.getItem("hsc-registrations") ?? "[]") as unknown[];

        localStorage.setItem(
            "hsc-registrations",
            JSON.stringify([...existing, { ...entry, createdAt: new Date().toISOString() }])
        );

        setStatus("submitted");
        event.currentTarget.reset();
    }

    return (
        <main className="registration-page">
            <div className="registration-lang-bar">
                <LangSelect />
            </div>

            <section className="registration-shell">
                <div className="registration-intro">
                    <Link className="back-link" to="/">
                        <ArrowLeft size={17} aria-hidden="true" />
                        {isAdminRoute ? t.reg_back_public : t.reg_back_home}
                    </Link>

                    <p className="eyebrow">{t.reg_eyebrow}</p>
                    <h1>{t.reg_heading}</h1>
                    <p>{t.reg_copy}</p>

                    <div className="registration-points">
                        <span>
                            <Check size={18} aria-hidden="true" />
                            {t.reg_point_1}
                        </span>
                        <span>
                            <Check size={18} aria-hidden="true" />
                            {t.reg_point_2}
                        </span>
                        <span>
                            <Check size={18} aria-hidden="true" />
                            {t.reg_point_3}
                        </span>
                    </div>
                </div>

                <form className="registration-form" onSubmit={handleSubmit}>
                    <div className="form-header">
                        <div>
                            <p className="panel-kicker">{t.reg_kicker}</p>
                            <h2>{t.reg_form_heading}</h2>
                        </div>
                        {status === "submitted" && <span className="success-pill">{t.reg_received}</span>}
                    </div>

                    <div className="field-grid">
                        <label>
                            {t.reg_first_name}
                            <input name="firstName" type="text" autoComplete="given-name" required />
                        </label>
                        <label>
                            {t.reg_last_name}
                            <input name="lastName" type="text" autoComplete="family-name" required />
                        </label>
                    </div>

                    <label>
                        {t.reg_email} <span className="field-optional">{t.reg_optional}</span>
                        <input name="email" type="email" autoComplete="email" />
                    </label>

                    <div className="field-grid">
                        <label>
                            {t.reg_club}
                            <input
                                name="club"
                                type="text"
                                placeholder={t.reg_search}
                                list="club-options"
                                autoComplete="off"
                                required
                            />
                            <datalist id="club-options">
                                {clubOptions.map((club) => (
                                    <option key={club} value={club} />
                                ))}
                            </datalist>
                        </label>
                        <label>
                            {t.reg_class}
                            <select name="category" required defaultValue="">
                                <option value="" disabled>
                                    {t.reg_select_class}
                                </option>
                                <option value="1">{t.reg_class_1}</option>
                                <option value="2">{t.reg_class_2}</option>
                                <option value="3">{t.reg_class_3}</option>
                                <option value="4">{t.reg_class_4}</option>
                            </select>
                        </label>
                        <label>
                            {t.reg_title}
                            <select name="title" required defaultValue="">
                                <option value="" disabled>
                                    {t.reg_select_title}
                                </option>
                                <option value="mr">{t.reg_mr}</option>
                                <option value="mrs">{t.reg_mrs}</option>
                                <option value="junior">{t.reg_junior}</option>
                                <option value="minior">{t.reg_minior}</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        {t.reg_notes}
                        <textarea
                            name="notes"
                            rows={4}
                            placeholder={t.reg_notes_ph}
                        />
                    </label>

                    <button className="primary-action form-submit" type="submit">
                        {t.reg_submit}
                        <Send size={18} aria-hidden="true" />
                    </button>

                    {status === "submitted" && (
                        <p className="form-message">{t.reg_saved}</p>
                    )}
                </form>
            </section>
        </main>
    );
}
