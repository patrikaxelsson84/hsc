import { CalendarDays, Trophy, Users } from "lucide-react";
import { useLanguage } from "../lib/language";
import { usePlayers } from "../contexts/PlayersContext";
import { useCompetitions } from "../contexts/CompetitionsContext";

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
        {
            icon: Users,
            value: players.length,
            label: lang === "sv" ? "Spelare" : "Players",
        },
        {
            icon: Trophy,
            value: clubCount,
            label: lang === "sv" ? "Klubbar" : "Clubs",
        },
        {
            icon: CalendarDays,
            value: upcoming.length,
            label: lang === "sv" ? "Kommande tävlingar" : "Upcoming contests",
        },
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

            {/* Placeholder for future settings */}
            <section className="admin-panel" style={{ opacity: 0.5 }}>
                <div className="panel-title-row">
                    <h2>{lang === "sv" ? "Inställningar" : "Settings"}</h2>
                    <span className="club-tab-count">{lang === "sv" ? "Kommer snart" : "Coming soon"}</span>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {lang === "sv"
                        ? "Här kommer du kunna konfigurera systemet, hantera notifieringar och mer."
                        : "Here you will be able to configure the system, manage notifications, and more."}
                </p>
            </section>
        </div>
    );
}
