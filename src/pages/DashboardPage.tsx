import { CalendarDays, ChevronRight, Radio, Star, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../lib/language";
import { usePlayers } from "../contexts/PlayersContext";
import { useCompetitions } from "../contexts/CompetitionsContext";
import { fetchOnlineClubs, subscribeOnlineClubs } from "../lib/presence";

const navItems = [
    {
        key: "bonus",
        icon: Star,
        label: "Bonus jakten",
        desc: "Specialtävling med bonuspoäng och extra utmaningar.",
        iconColor: "#f59e0b",
        iconBg: "#fef3c7",
        cardBg: "#fffbeb",
        border: "#fde68a",
    },
];

export default function DashboardPage() {
    const { lang } = useLanguage();
    const { players } = usePlayers();
    const { competitions } = useCompetitions();

    const clubCount = new Set(players.map((p) => p.club).filter(Boolean)).size;
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = [...competitions]
        .filter((c) => c.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    const nextComp = upcoming[0] ?? null;

    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [onlineClubs, setOnlineClubs] = useState<string[]>([]);

    useEffect(() => {
        fetchOnlineClubs().then(setOnlineClubs);
        const unsub = subscribeOnlineClubs(() => fetchOnlineClubs().then(setOnlineClubs));
        return unsub;
    }, []);

    const stats = [
        { icon: Users,       value: players.length,   label: lang === "sv" ? "Spelare"             : "Players" },
        { icon: Trophy,      value: clubCount,         label: lang === "sv" ? "Klubbar"             : "Clubs" },
        { icon: CalendarDays,value: upcoming.length,   label: lang === "sv" ? "Kommande tävlingar"  : "Upcoming contests" },
    ];

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">{lang === "sv" ? "Instrumentpanel" : "Dashboard"}</p>
                    <h1>{lang === "sv" ? "Välkommen" : "Welcome"}</h1>
                    <p style={{ color: "var(--text-muted)" }}>
                        {lang === "sv"
                            ? "Använd menyn till vänster för att navigera."
                            : "Use the menu on the left to navigate."}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="dashboard-stats">
                {stats.map(({ icon: Icon, value, label }) => (
                    <div className="dashboard-stat-card" key={label}>
                        <Icon size={22} className="dashboard-stat-icon" aria-hidden="true" />
                        <span className="dashboard-stat-value">{value}</span>
                        <span className="dashboard-stat-label">{label}</span>
                    </div>
                ))}
            </div>

            {/* Online clubs */}
            <section className="admin-panel">
                <div className="panel-title-row">
                    <h2>{lang === "sv" ? "Online just nu" : "Online now"}</h2>
                    <span className={onlineClubs.length > 0 ? "online-badge active" : "online-badge"}>
                        <Radio size={13} />
                        {onlineClubs.length} {lang === "sv" ? "inloggade" : "logged in"}
                    </span>
                </div>
                {onlineClubs.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        {lang === "sv" ? "Inga klubbar är inloggade just nu." : "No clubs are logged in right now."}
                    </p>
                ) : (
                    <ul className="online-clubs-list">
                        {onlineClubs.map((club) => (
                            <li key={club} className="online-club-row">
                                <span className="online-dot" />
                                {club}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Next competition */}
            {nextComp && (
                <section className="admin-panel">
                    <div className="panel-title-row">
                        <h2>{lang === "sv" ? "Nästa tävling" : "Next competition"}</h2>
                        <span className="success-pill">
                            {nextComp.registrationOpen
                                ? (lang === "sv" ? "Öppen" : "Open")
                                : (lang === "sv" ? "Stängd" : "Closed")}
                        </span>
                    </div>
                    <p>
                        <strong>{nextComp.name}</strong>
                        {" · "}
                        {new Date(nextComp.date + "T12:00:00").toLocaleDateString(
                            lang === "sv" ? "sv-SE" : "en-GB",
                            { day: "numeric", month: "long", year: "numeric" }
                        )}
                        {nextComp.location && ` · ${nextComp.location}`}
                    </p>
                </section>
            )}

            {/* Public nav preview */}
            <section className="admin-panel">
                <div className="panel-title-row">
                    <h2>{lang === "sv" ? "Webbplatsmeny" : "Site menu"}</h2>
                    <span className="club-tab-count">{lang === "sv" ? "Förhandsvisning" : "Preview"}</span>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                    {lang === "sv"
                        ? "Så här kommer menyalternativen se ut på den publika sidan."
                        : "This is how the menu items will appear on the public site."}
                </p>
                <div className="dash-nav-grid">
                    {navItems.map(({ key, icon: Icon, label, desc, iconColor, iconBg, cardBg, border, submenu }) => (
                        <div className="dash-nav-card-wrap" key={key}
                            onMouseEnter={() => submenu && setHoveredKey(key)}
                            onMouseLeave={() => setHoveredKey(null)}>
                            <div className="dash-nav-card"
                                style={{ background: cardBg, borderColor: border }}>
                                <span className="dash-nav-icon"
                                    style={{ background: iconBg, color: iconColor }}>
                                    <Icon size={22} aria-hidden="true" />
                                </span>
                                <span className="dash-nav-text">
                                    <strong>{label}</strong>
                                    <span>{desc}</span>
                                </span>
                                {submenu && <ChevronRight size={16} className="dash-nav-chevron" aria-hidden="true" />}
                            </div>
                            {submenu && hoveredKey === key && (
                                <div className="dash-nav-submenu">
                                    {submenu.map((item) => (
                                        <button key={item} className="dash-nav-submenu-item" type="button"
                                            style={{ background: cardBg, borderColor: border }}>
                                            <span className="dash-nav-submenu-dot" style={{ background: iconColor }} />
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
