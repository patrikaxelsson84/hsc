import { ArrowRight, Play, UserPlus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { currentCompetition, samplePlayers } from "../data/sampleCompetition";

const adminChoices = [
    {
        title: "Register a player",
        text: "Add a new player entry with club, category, and competition details.",
        path: "/admin/registration",
        icon: UserPlus,
    },
    {
        title: "Teams and players",
        text: "See the full roster and review all clubs, teams, classes, and categories.",
        path: "/admin/players",
        icon: Users,
    },
    {
        title: "Start a contest",
        text: "Open scoring for the active competition and begin entering results.",
        path: "/admin/scoring",
        icon: Play,
    },
];

export default function DashboardPage() {
    const teamCount = new Set(samplePlayers.map((player) => player.club).filter(Boolean)).size;

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">Logged in</p>
                    <h1>What do you want to do?</h1>
                    <p>
                        Choose the next step for {currentCompetition.name}: register players, review
                        teams, or start the contest.
                    </p>
                </div>
            </div>

            <section className="admin-choice-grid" aria-label="Admin choices">
                {adminChoices.map((choice) => {
                    const Icon = choice.icon;

                    return (
                        <Link className="admin-choice-card" to={choice.path} key={choice.title}>
                            <span className="admin-choice-icon">
                                <Icon size={24} aria-hidden="true" />
                            </span>
                            <span>
                                <strong>{choice.title}</strong>
                                <span>{choice.text}</span>
                            </span>
                            <ArrowRight size={20} aria-hidden="true" />
                        </Link>
                    );
                })}
            </section>

            <section className="admin-panel">
                <div className="panel-title-row">
                    <h2>Current competition</h2>
                    <span className="success-pill">{currentCompetition.registrationOpen ? "Open" : "Closed"}</span>
                </div>
                <p>
                    {samplePlayers.length} players from {teamCount} teams are available for the
                    active competition.
                </p>
            </section>
        </div>
    );
}
