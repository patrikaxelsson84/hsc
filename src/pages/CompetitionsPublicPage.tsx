import { ArrowLeft, MapPin } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { loadCompetitions, type Competition } from "../data/competitions";
import LangSelect from "../components/LangSelect";
import { useLanguage } from "../lib/language";

function fmtDate(iso: string) {
    const d = new Date(iso + "T12:00:00");
    return {
        mon: d.toLocaleString("sv-SE", { month: "short" }).toUpperCase(),
        day: d.getDate(),
        full: d.toLocaleString("sv-SE", { day: "numeric", month: "long", year: "numeric" }),
    };
}

export default function CompetitionsPublicPage() {
    const [competitions] = useState<Competition[]>(loadCompetitions);
    const { t } = useLanguage();

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = competitions
        .filter((c) => c.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    const past = competitions
        .filter((c) => c.date < today)
        .sort((a, b) => b.date.localeCompare(a.date));

    return (
        <main className="public-page">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="HSC home">
                    <span className="brand-mark">HSC</span>
                    <span>{t.brand_subtitle}</span>
                </Link>
                <LangSelect />
            </header>

            <div className="competitions-public-shell">
                <div className="competitions-public-intro">
                    <Link className="back-link" to="/">
                        <ArrowLeft size={17} aria-hidden="true" />
                        {t.back_home}
                    </Link>
                    <p className="eyebrow">{t.comps_eyebrow}</p>
                    <h1>{t.comps_heading}</h1>
                    <p className="hero-copy">{t.comps_copy}</p>
                </div>

                {upcoming.length > 0 && (
                    <section className="comps-public-section">
                        <h2 className="comps-section-label">{t.comps_upcoming}</h2>
                        <ul className="competition-list competition-list--full">
                            {upcoming.map((comp) => {
                                const { mon, day, full } = fmtDate(comp.date);
                                return (
                                    <li key={comp.id} className="competition-row competition-row--full">
                                        <div className="comp-date-badge" aria-hidden="true">
                                            <span>{mon}</span>
                                            <strong>{day}</strong>
                                        </div>
                                        <div className="comp-info">
                                            <span className="comp-name">{comp.name}</span>
                                            <span className="comp-meta">
                                                <MapPin size={12} aria-hidden="true" />
                                                {comp.location || full}
                                            </span>
                                        </div>
                                        <div className="comp-row-end">
                                            {comp.organizer && (
                                                <span className="comp-organizer">{comp.organizer}</span>
                                            )}
                                            {comp.ranking && (
                                                <span className="comp-ranking-badge">{t.ranking}</span>
                                            )}
                                            {comp.registrationOpen ? (
                                                <Link
                                                    className="comp-register-btn"
                                                    to={`/registration?comp=${comp.id}`}
                                                >
                                                    {t.status_open}
                                                </Link>
                                            ) : (
                                                <span className="comp-status status-closed">{t.status_closed}</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {past.length > 0 && (
                    <section className="comps-public-section">
                        <h2 className="comps-section-label">{t.comps_past}</h2>
                        <ul className="competition-list competition-list--full competition-list--past">
                            {past.map((comp) => {
                                const { mon, day } = fmtDate(comp.date);
                                return (
                                    <li key={comp.id} className="competition-row competition-row--full">
                                        <div className="comp-date-badge comp-date-badge--past" aria-hidden="true">
                                            <span>{mon}</span>
                                            <strong>{day}</strong>
                                        </div>
                                        <div className="comp-info">
                                            <span className="comp-name">{comp.name}</span>
                                            {comp.location && (
                                                <span className="comp-meta">
                                                    <MapPin size={12} aria-hidden="true" />
                                                    {comp.location}
                                                </span>
                                            )}
                                        </div>
                                        <div className="comp-row-end">
                                            {comp.organizer && (
                                                <span className="comp-organizer">{comp.organizer}</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {competitions.length === 0 && (
                    <p className="comps-empty">{t.comps_empty}</p>
                )}
            </div>
        </main>
    );
}
