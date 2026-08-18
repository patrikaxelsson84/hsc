import { ArrowRight, Play, UserPlus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { currentCompetition } from "../data/sampleCompetition";
import { useLanguage } from "../lib/language";
import { usePlayers } from "../contexts/PlayersContext";

export default function DashboardPage() {
    const { t, lang } = useLanguage();
    const { players } = usePlayers();
    const teamCount = new Set(players.map((p) => p.club).filter(Boolean)).size;

    const adminChoices = [
        {
            title: t.dash_card_reg_title,
            text:  t.dash_card_reg_text,
            path:  "/admin/registration",
            icon:  UserPlus,
        },
        {
            title: t.dash_card_teams_title,
            text:  t.dash_card_teams_text,
            path:  "/admin/players",
            icon:  Users,
        },
        {
            title: t.dash_card_start_title,
            text:  t.dash_card_start_text,
            path:  "/admin/scoring",
            icon:  Play,
        },
    ];

    const fromWord   = lang === "sv" ? "från"        : "from";
    const availText  = lang === "sv"
        ? "är tillgängliga för den aktiva tävlingen."
        : "are available for the active competition.";

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">{t.dash_eyebrow}</p>
                    <h1>{t.dash_heading}</h1>
                    <p>
                        {players.length}{" "}
                        {players.length === 1 ? t.players_player_s : t.players_player_p}{" "}
                        {fromWord}{" "}
                        {teamCount}{" "}
                        {teamCount === 1 ? t.sc_team_s : t.sc_team_p}{" "}
                        {availText}
                    </p>
                </div>
            </div>

            <section className="admin-choice-grid" aria-label={t.dash_heading}>
                {adminChoices.map((choice) => {
                    const Icon = choice.icon;
                    return (
                        <Link className="admin-choice-card" to={choice.path} key={choice.path}>
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
                    <h2>{t.dash_current_comp}</h2>
                    <span className="success-pill">
                        {currentCompetition.registrationOpen ? t.status_open : t.status_closed}
                    </span>
                </div>
                <p>
                    {players.length}{" "}
                    {players.length === 1 ? t.players_player_s : t.players_player_p}{" "}
                    {fromWord} {teamCount}{" "}
                    {teamCount === 1 ? t.sc_team_s : t.sc_team_p}.
                </p>
            </section>
        </div>
    );
}
