import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import type { ClassLevel, PlayerScore, RankedPlayer, TeamAssignment, TeamResult } from "../lib/scoring";
import { getSecondChancePlayers, rankPlayers, rankTeams } from "../lib/scoring";
import { useLanguage } from "../lib/language";

const liveScorePrefix  = "hsc-live-v1";
const teamsStoragePrefix = "hsc-teams-v1";
const activeContestKey = "hsc-active-v1";

type ActiveContest = { runId: string; contestName: string; typeName: string };

function readLiveData(): { active: ActiveContest; players: PlayerScore[]; teamAssignments: TeamAssignment[] } | null {
    try {
        const raw = localStorage.getItem(activeContestKey);
        if (!raw) return null;
        const active = JSON.parse(raw) as ActiveContest;
        const playersRaw = localStorage.getItem(`${liveScorePrefix}-${active.runId}`);
        if (!playersRaw) return null;
        const teamsRaw = localStorage.getItem(`${teamsStoragePrefix}-${active.runId}`);
        const teamAssignments: TeamAssignment[] = teamsRaw ? JSON.parse(teamsRaw) : [];
        return { active, players: JSON.parse(playersRaw) as PlayerScore[], teamAssignments };
    } catch {
        return null;
    }
}

function getTiedTotals(rankings: RankedPlayer[]) {
    const counts = new Map<number, number>();
    for (const p of rankings) counts.set(p.total, (counts.get(p.total) ?? 0) + 1);
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([t]) => t));
}

function ClassResultBox({ classLevel, players }: { classLevel: ClassLevel; players: PlayerScore[] }) {
    const { t } = useLanguage();
    const rankings  = rankPlayers(players);
    const tiedTotals = getTiedTotals(rankings);
    const hasTies   = tiedTotals.size > 0;
    const secondChance = classLevel === 4 ? getSecondChancePlayers(players, 4) : [];

    return (
        <section className="results-class-box">
            <div className="results-class-header">
                <h2>{t.results_class_prefix} {classLevel}</h2>
                <span className="success-pill">
                    {players.length} {players.length === 1 ? t.results_player_s : t.results_player_p}
                </span>
            </div>

            <div className="table-shell results-class-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t.results_col_num}</th>
                            <th>{t.results_col_player}</th>
                            <th>{t.results_col_club}</th>
                            <th>{t.results_col_total}</th>
                            {hasTies && <th>{t.results_col_7m}</th>}
                            <th>{t.results_col_points}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankings.map((player) => (
                            <tr key={player.id} className={player.rank <= 3 ? "top-rank" : undefined}>
                                <td className="rank-cell">{player.rank}</td>
                                <td>{player.name}</td>
                                <td>{player.club || "–"}</td>
                                <td>{player.total}</td>
                                {hasTies && (
                                    <td>{tiedTotals.has(player.total) ? player.sevenMeters : null}</td>
                                )}
                                <td>{player.rankingPoints}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {secondChance.length > 0 && (
                <div className="results-second-chance">
                    <strong>Andra chansen:</strong>{" "}
                    {secondChance.map((p) => p.name).join(", ")}
                </div>
            )}
        </section>
    );
}

function TeamResultBox({ teams }: { teams: TeamResult[] }) {
    const { t } = useLanguage();
    if (teams.length === 0) return null;

    return (
        <section className="results-class-box results-team-box">
            <div className="results-class-header">
                <h2>{t.results_team_heading}</h2>
                <span className="success-pill">
                    {teams.length} {teams.length === 1 ? t.results_team_s : t.results_team_p}
                </span>
            </div>

            <div className="table-shell results-class-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t.results_col_num}</th>
                            <th>{t.results_col_teams_name}</th>
                            <th>{t.results_col_players}</th>
                            <th>{t.results_col_total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team) => (
                            <tr key={team.id} className={team.rank <= 3 ? "top-rank" : undefined}>
                                <td className="rank-cell">{team.rank}</td>
                                <td><strong>{team.name}</strong></td>
                                <td className="team-player-list">
                                    {team.players.map((p) => (
                                        <span key={p.id} className="team-player-chip">
                                            {p.name}
                                            <span className="team-player-score">{p.total}</span>
                                        </span>
                                    ))}
                                </td>
                                <td><strong>{team.total}</strong></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default function ResultsPage() {
    const { t } = useLanguage();
    const [liveData, setLiveData] = useState(readLiveData);

    useEffect(() => {
        const refresh = () => setLiveData(readLiveData());
        const interval = setInterval(refresh, 3000);
        window.addEventListener("storage", refresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    if (!liveData) {
        return (
            <div className="admin-page">
                <div className="results-empty-state">
                    <img src="/error.avif" alt="" width={220} />
                    <h1>{t.results_empty_heading}</h1>
                    <p>{t.results_empty_desc}</p>
                </div>
            </div>
        );
    }

    const { active, players, teamAssignments } = liveData;
    const presentClasses = [...new Set(players.map((p) => p.classLevel))].sort() as ClassLevel[];
    const teams = rankTeams(players, teamAssignments);

    return (
        <div className="admin-page">
            <div className="admin-page-header results-no-print">
                <div>
                    <p className="eyebrow">{t.results_eyebrow}</p>
                    <h1>{active.contestName}</h1>
                    <p>
                        {active.typeName} · {players.length}{" "}
                        {players.length === 1 ? t.results_player_s : t.results_player_p}{" "}
                        · {t.results_updates_auto}
                    </p>
                </div>
                <button
                    className="secondary-action score-button"
                    type="button"
                    onClick={() => window.print()}
                >
                    <Printer size={17} aria-hidden="true" />
                    {t.results_print}
                </button>
            </div>

            <div className="results-print-title">
                <h1>{active.contestName}</h1>
                <p>{active.typeName}</p>
            </div>

            <div className="results-class-grid">
                {presentClasses.map((cl) => (
                    <ClassResultBox
                        key={cl}
                        classLevel={cl}
                        players={players.filter((p) => p.classLevel === cl)}
                    />
                ))}
            </div>

            <div className="results-team-section">
                <TeamResultBox teams={teams} />
            </div>
        </div>
    );
}
