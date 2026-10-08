import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    BarChart2,
    MapPin,
    Medal,
    MessageSquare,
    Radio,
    ShieldCheck,
    Star,
    Trophy,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isCompetitionOpen } from "../data/competitions";
import { useCompetitions } from "../contexts/CompetitionsContext";
import HorseshoeArt from "../components/HorseshoeArt";
import LangSelect from "../components/LangSelect";
import { useLanguage } from "../lib/language";

const exploreItems = [
    {
        key: "ranking",
        icon: BarChart2,
        label: "Ranking",
        desc: "Svenska rankinglistor för spelare och lag i alla klasser.",
        iconColor: "#2563eb",
        iconBg: "#dbeafe",
        accent: "#3b82f6",
        submenu: ["Sverigeranking", "Juniorranking", "Miniorranking", "Seriespel", "Bonusjakten", "Årets raket", "Lagranking", "100-klubben"],
    },
    {
        key: "bonus",
        icon: Star,
        label: "Bonus jakten",
        desc: "Specialtävling med bonuspoäng och extra utmaningar.",
        iconColor: "#d97706",
        iconBg: "#fef3c7",
        accent: "#f59e0b",
    },
    {
        key: "regler",
        icon: BookOpen,
        label: "Regler",
        desc: "Officiella tävlingsregler och riktlinjer för alla klasser.",
        iconColor: "#059669",
        iconBg: "#d1fae5",
        accent: "#10b981",
        link: "/regler",
    },
    {
        key: "gastbok",
        icon: MessageSquare,
        label: "Gästbok",
        desc: "Läs och lämna hälsningar från spelare och besökare.",
        iconColor: "#7c3aed",
        iconBg: "#ede9fe",
        accent: "#8b5cf6",
        link: "/gastbok",
    },
];

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
    const { competitions } = useCompetitions();
    const { t } = useLanguage();
    const today = new Date().toISOString().slice(0, 10);
    const [calCountry, setCalCountry] = useState<"SE" | "PL">(() => {
        return (localStorage.getItem("hsc-cal-country") as "SE" | "PL") ?? "SE";
    });
    function switchCountry(c: "SE" | "PL") {
        setCalCountry(c);
        localStorage.setItem("hsc-cal-country", c);
    }
    const upcoming = competitions
        .filter((c) => c.date >= today && (c.country ?? "SE") === calCountry)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);

    return (
        <main className="public-page">
            <header className="site-header">
                <div className="header-left">
                    <Link className="brand" to="/" aria-label="HSC home">
                        <span className="brand-mark">HSC</span>
                        <span>{t.brand_subtitle}</span>
                    </Link>
                    <nav className="site-nav">
                        <Link to="/grand-prix" className="site-nav-link">
                            <Medal size={14} aria-hidden="true" />
                            Sweden Grand Prix
                        </Link>
                    </nav>
                </div>

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
                    <Link className="live-results-hero-btn" to="/results">
                        <Radio size={16} aria-hidden="true" />
                        {t.hero_live_results}
                    </Link>
                </div>

                <aside className="event-panel" id="calendar" aria-label="Competition calendar">
                    <div className="event-panel-header">
                        <div>
                            <p className="panel-kicker">{t.panel_kicker}</p>
                            <h2>{t.panel_heading}</h2>
                        </div>
                        <div className="cal-country-toggle">
                            <button
                                type="button"
                                className={calCountry === "SE" ? "cal-country-btn active" : "cal-country-btn"}
                                onClick={() => switchCountry("SE")}
                            >🇸🇪 SE</button>
                            <button
                                type="button"
                                className={calCountry === "PL" ? "cal-country-btn active" : "cal-country-btn"}
                                onClick={() => switchCountry("PL")}
                            >🇵🇱 PL</button>
                        </div>
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
                                    <span className={isCompetitionOpen(comp) ? "comp-status status-open" : "comp-status status-closed"}>
                                        {isCompetitionOpen(comp) ? t.status_open : t.status_closed}
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

            <section className="explore-section">
                <div className="explore-inner">
                    <div className="explore-header">
                        <p className="eyebrow">Utforska</p>
                        <h2>Allt om hästskokastning</h2>
                        <p className="explore-sub">
                            Serier, bonustävlingar, regler och gemenskap – samlat på ett ställe.
                        </p>
                    </div>
                    <div className="explore-grid">
                        {exploreItems.map(({ key, icon: Icon, label, desc, iconColor, iconBg, accent, submenu, link }) => (
                            <div className="explore-card-wrap" key={key}>
                                {link ? (
                                    <Link to={link} className="explore-card" style={{ "--card-accent": accent } as React.CSSProperties}>
                                        <span className="explore-card-icon" style={{ background: iconBg, color: iconColor }}>
                                            <Icon size={24} aria-hidden="true" />
                                        </span>
                                        <div className="explore-card-body">
                                            <h3>{label}</h3>
                                            <p>{desc}</p>
                                        </div>
                                        <ChevronRight size={18} className="explore-card-arrow" aria-hidden="true" />
                                    </Link>
                                ) : (
                                <div className="explore-card" style={{ "--card-accent": accent } as React.CSSProperties}>
                                    <span className="explore-card-icon" style={{ background: iconBg, color: iconColor }}>
                                        <Icon size={24} aria-hidden="true" />
                                    </span>
                                    <div className="explore-card-body">
                                        <h3>{label}</h3>
                                        <p>{desc}</p>
                                    </div>
                                    <ChevronRight size={18} className="explore-card-arrow" aria-hidden="true" />
                                </div>
                                )}
                                {submenu && (
                                    <div className="explore-submenu" style={{ borderColor: `${accent}40` }}>
                                        {submenu.map((item) => (
                                            <button key={item} className="explore-submenu-item" type="button"
                                                style={{ "--item-accent": iconColor, "--item-bg": iconBg } as React.CSSProperties}>
                                                <span className="explore-submenu-dot" style={{ background: iconColor }} />
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="art-section">
                <HorseshoeArt />
            </section>

            <footer className="site-footer">
                <div className="site-footer-inner">
                    <span className="site-footer-copy">
                        © {new Date().getFullYear()} hscontest.se. All rights reserved.
                    </span>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <Link className="site-footer-link" to="/privacy">
                        {t.footer_privacy}
                    </Link>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <Link className="site-footer-link" to="/club-apply">
                        {t.apply_link}
                    </Link>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <span className="site-footer-dev">
                        Designed and developed by Patrik Axelsson.
                    </span>
                </div>
            </footer>
        </main>
    );
}
