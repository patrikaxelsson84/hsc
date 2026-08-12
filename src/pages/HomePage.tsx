import {
    ArrowRight,
    CalendarDays,
    ChevronDown,
    MapPin,
    ShieldCheck,
    Trophy,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadCompetitions, type Competition } from "../data/competitions";
import HorseshoeArt from "../components/HorseshoeArt";
import LangSelect from "../components/LangSelect";
import { useLanguage } from "../lib/language";

function loadUpcoming() {
    const today = new Date().toISOString().slice(0, 10);
    return loadCompetitions()
        .filter((c) => c.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);
}

function fmtDate(iso: string) {
    const d = new Date(iso + "T12:00:00");
    return {
        mon: d.toLocaleString("sv-SE", { month: "short" }).toUpperCase(),
        day: d.getDate(),
        full: d.toLocaleString("sv-SE", { day: "numeric", month: "long" }),
    };
}

function LoginMenu() {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="login-menu" ref={ref}>
            <button
                className="header-action login-menu-trigger"
                type="button"
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                {t.nav_login}
                <ChevronDown size={15} className={open ? "login-chevron open" : "login-chevron"} aria-hidden="true" />
            </button>
            {open && (
                <div className="login-menu-dropdown" role="menu">
                    <Link
                        className="login-menu-item"
                        to="/admin"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                    >
                        <ShieldCheck size={16} aria-hidden="true" />
                        {t.nav_login_admin}
                    </Link>
                    <Link
                        className="login-menu-item"
                        to="/club"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                    >
                        <Trophy size={16} aria-hidden="true" />
                        {t.nav_login_club}
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function HomePage() {
    const [upcoming] = useState<Competition[]>(loadUpcoming);
    const { t } = useLanguage();

    return (
        <main className="public-page">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="HSC home">
                    <span className="brand-mark">HSC</span>
                    <span>{t.brand_subtitle}</span>
                </Link>

                <a className="svhkf-logo-link" href="https://www.svhkf.se/" target="_blank" rel="noopener noreferrer" aria-label="Sv HKF">
                    <img className="svhkf-logo" src="/svhkf-logo.png" alt="Svenska Hästskokastarförbundet" />
                </a>

                <LoginMenu />
                <LangSelect />
            </header>

            <section className="hero-section">
                <div className="hero-content">
                    <p className="eyebrow">{t.hero_eyebrow}</p>
                    <h1>{t.hero_title}</h1>
                    <p className="hero-copy">{t.hero_copy}</p>
                </div>

                <aside className="event-panel" id="calendar" aria-label="Competition calendar">
                    <div className="event-panel-header">
                        <div>
                            <p className="panel-kicker">{t.panel_kicker}</p>
                            <h2>{t.panel_heading}</h2>
                        </div>
                        <CalendarDays size={26} aria-hidden="true" />
                    </div>

                    <ul className="competition-list">
                        {upcoming.length === 0 && (
                            <li className="competition-row" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                                {t.panel_empty}
                            </li>
                        )}
                        {upcoming.map((comp) => {
                            const { mon, day, full } = fmtDate(comp.date);
                            return (
                                <li key={comp.id} className="competition-row">
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
                                    <span className={comp.registrationOpen ? "comp-status status-open" : "comp-status status-closed"}>
                                        {comp.registrationOpen ? t.status_open : t.status_closed}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    <Link className="view-all-link" to="/competitions">
                        {t.panel_view_all}
                        <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                </aside>
            </section>

            <section className="art-section">
                <HorseshoeArt />
            </section>
        </main>
    );
}
