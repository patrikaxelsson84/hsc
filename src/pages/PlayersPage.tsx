import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { samplePlayers } from "../data/sampleCompetition";

const sortedPlayers = [...samplePlayers].sort((firstPlayer, secondPlayer) => {
    const teamCompare = firstPlayer.club.localeCompare(secondPlayer.club);

    if (teamCompare !== 0) {
        return teamCompare;
    }

    if (firstPlayer.classLevel !== secondPlayer.classLevel) {
        return firstPlayer.classLevel - secondPlayer.classLevel;
    }

    return firstPlayer.name.localeCompare(secondPlayer.name);
});

const playersByTeam = sortedPlayers.reduce<Record<string, typeof samplePlayers>>((teams, player) => {
    const team = player.club || "No team";

    teams[team] ??= [];
    teams[team].push(player);

    return teams;
}, {});

const teamGroups = Object.entries(playersByTeam).sort(([firstTeam], [secondTeam]) =>
    firstTeam.localeCompare(secondTeam)
);

export default function PlayersPage() {
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const selectedPlayers = selectedTeam ? playersByTeam[selectedTeam] : [];
    const selectedClassCount = useMemo(
        () => new Set(selectedPlayers.map((player) => player.classLevel)).size,
        [selectedPlayers]
    );

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">Roster</p>
                    <h1>{selectedTeam ?? "Clubs"}</h1>
                    <p>
                        {selectedTeam
                            ? "Club members sorted by class and name."
                            : "Choose a club to see its members."}
                    </p>
                </div>
                {selectedTeam && (
                    <button
                        className="secondary-action roster-back-button"
                        type="button"
                        onClick={() => setSelectedTeam(null)}
                    >
                        <ArrowLeft size={17} aria-hidden="true" />
                        All clubs
                    </button>
                )}
            </div>

            {selectedTeam ? (
                <section className="team-roster-list" aria-label={`${selectedTeam} members`}>
                    <article className="team-roster-group">
                        <div className="team-roster-header">
                            <div>
                                <h2>{selectedTeam}</h2>
                                <p>
                                    {selectedPlayers.length}{" "}
                                    {selectedPlayers.length === 1 ? "player" : "players"}
                                </p>
                            </div>
                            <span className="success-pill">{selectedClassCount} classes</span>
                        </div>

                        <div className="table-shell">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Class</th>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th>7-meters</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPlayers.map((player) => (
                                        <tr key={player.id}>
                                            <td>Class {player.classLevel}</td>
                                            <td>{player.name}</td>
                                            <td>{player.ageCategory}</td>
                                            <td>{player.sevenMeters}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </article>
                </section>
            ) : (
                <section className="club-grid" aria-label="Clubs">
                    {teamGroups.map(([team, players]) => (
                        <button
                            className="club-card"
                            key={team}
                            type="button"
                            onClick={() => setSelectedTeam(team)}
                        >
                            <span className="club-card-icon">
                                <Users size={22} aria-hidden="true" />
                            </span>
                            <span>
                                <strong>{team}</strong>
                                <span>
                                    {players.length} {players.length === 1 ? "member" : "members"} ·{" "}
                                    {new Set(players.map((player) => player.classLevel)).size} classes
                                </span>
                            </span>
                            <ArrowRight size={19} aria-hidden="true" />
                        </button>
                    ))}
                </section>
            )}
        </div>
    );
}
