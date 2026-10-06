import { BookOpen, CalendarDays, MessageSquare, Star, Trophy, Users } from "lucide-react";
import { useLanguage } from "../lib/language";
import { usePlayers } from "../contexts/PlayersContext";
import { useCompetitions } from "../contexts/CompetitionsContext";

const navItems = [
    {
        key: "serie",
        icon: Trophy,
        label: "Serie spel",
        desc: "Följ serieresultat och tabeller för säsongen.",
        color: "#60a5fa",
        bg: "#f0f7ff",
        darkBg: "#1e3a5f",
    },
    {
        key: "bonus",
        icon: Star,
        label: "Bonus jakten",
        desc: "Specialtävling med bonuspoäng och extra utmaningar.",
        color: "#fbbf24",
        bg: "#fffdf0",
        darkBg: "#4a3000",
    },
    {
        key: "regler",
        icon: BookOpen,
        label: "Regler",
        desc: "Officiella tävlingsregler och riktlinjer.",
        color: "#34d399",
        bg: "#f0fdf8",
        darkBg: "#0a3d2e",
    },
    {
        key: "gastbok",
        icon: MessageSquare,
        label: "Gästbok",
        desc: "Läs och lämna hälsningar från besökare.",
        color: "#a78bfa",
        bg: "#f8f5ff",
        darkBg: "#2e1a5e",
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
                    {navItems.map(({ key, icon: Icon, label, desc, color, bg, darkBg }) => (
                        <div className="dash-nav-card" key={key}
                            style={{
                                "--nav-color": color,
                                "--nav-bg": bg,
                                "--nav-bg-dark": darkBg,
                            } as React.CSSProperties}>
                            <span className="dash-nav-icon">
                                <Icon size={22} aria-hidden="true" />
                            </span>
                            <span className="dash-nav-text">
                                <strong>{label}</strong>
                                <span>{desc}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
