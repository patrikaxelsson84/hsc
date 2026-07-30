import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { useState } from "react";
import { samplePlayers } from "../data/sampleCompetition";
import type { ClassLevel, AgeCategory, PlayerScore } from "../lib/scoring";

interface RegistrationEntry {
    firstName: string;
    lastName: string;
    email?: string;
    club: string;
    category: string;
    title: string;
    notes?: string;
    createdAt: string;
}

function titleToAgeCategory(title: string): AgeCategory {
    if (title === "mrs") return "dam";
    if (title === "junior") return "junior";
    if (title === "minior") return "minior";
    return "herr";
}

function loadRegisteredPlayers(): PlayerScore[] {
    try {
        const raw = localStorage.getItem("hsc-registrations");
        if (!raw) return [];
        const entries = JSON.parse(raw) as RegistrationEntry[];
        return entries.map((e) => ({
            id: `reg-${e.createdAt}`,
            name: `${e.firstName} ${e.lastName}`.trim(),
            club: e.club ?? "",
            classLevel: (Number(e.category) || 4) as ClassLevel,
            ageCategory: titleToAgeCategory(e.title),
            rounds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            sevenMeters: 0,
        }));
    } catch {
        return [];
    }
}

export default function PlayersPage() {
    const [players, setPlayers] = useState<PlayerScore[]>(() => {
        const registered = loadRegisteredPlayers();
        const registeredIds = new Set(registered.map((p) => p.name.toLowerCase()));
        const base = samplePlayers.filter((p) => !registeredIds.has(p.name.toLowerCase()));
        return [...base, ...registered];
    });
// <<< NEW CODE START >>>

    const sortedPlayers = [...players].sort((firstPlayer, secondPlayer) => {
        const teamCompare = firstPlayer.club.localeCompare(secondPlayer.club);

        if (teamCompare !== 0) {
            return teamCompare;
        }

        if (firstPlayer.classLevel !== secondPlayer.classLevel) {
            return firstPlayer.classLevel - secondPlayer.classLevel;
        }

        return firstPlayer.name.localeCompare(secondPlayer.name);
    });

    const playersByTeam = sortedPlayers.reduce<
        Record<string, typeof samplePlayers>
    >((teams, player) => {
        const team = player.club || "No team";

        teams[team] ??= [];
        teams[team].push(player);

        return teams;
    }, {});

    const teamGroups = Object.entries(playersByTeam).sort(
        ([firstTeam], [secondTeam]) =>
            firstTeam.localeCompare(secondTeam)
    );

// <<< NEW CODE END >>>
    // <<< NEW CODE START >>>
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

    const [editingPlayer, setEditingPlayer] =
        useState<(typeof samplePlayers)[number] | null>(null);
    const savePlayer = () => {
        if (!editingPlayer) return;

        setPlayers((currentPlayers) =>
            currentPlayers.map((player) =>
                player.id === editingPlayer.id
                    ? editingPlayer
                    : player
            )
        );

        // Close the roster if the player changed clubs
        if (editingPlayer.club !== selectedTeam) {
            setSelectedTeam(null);
        }

        setEditingPlayer(null);
    };

// <<< NEW CODE END >>>

    const selectedPlayers = selectedTeam
        ? playersByTeam[selectedTeam] ?? []
        : [];
    const selectedClassCount =
        new Set(selectedPlayers.map((player) => player.classLevel)).size;

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
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPlayers.map((player) => (
                                        <tr key={player.id}>
                                            <td>Class {player.classLevel}</td>
                                            <td>{player.name}</td>
                                            <td>{player.ageCategory}</td>
                                            <td>{player.sevenMeters}</td>
                                            <td>
                                                <button
                                                    className="secondary-action"
                                                    onClick={() => setEditingPlayer(player)}
                                                >
                                                    Edit
                                                </button>
                                            </td>
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
            {editingPlayer && (
                <div className="modal-overlay">
                    <div className="modal-card">

                        <h2>Edit {editingPlayer.name}</h2>

                        <label>Name</label>

                        <input
                            value={editingPlayer.name}
                            onChange={(e) =>
                                setEditingPlayer({
                                    ...editingPlayer,
                                    name: e.target.value,
                                })
                            }
                        />

                        <label>Club</label>

                        <select
                            value={editingPlayer.club}
                            onChange={(e) =>
                                setEditingPlayer({
                                    ...editingPlayer,
                                    club: e.target.value,
                                })
                            }
                        >
                            {teamGroups.map(([team]) => (
                                <option key={team} value={team}>
                                    {team}
                                </option>
                            ))}
                        </select>

                        <label>Class</label>

                        <select
                            value={editingPlayer.classLevel}
                            onChange={(e) =>
                                setEditingPlayer({
                                    ...editingPlayer,
                                    classLevel: Number(e.target.value) as ClassLevel,
                                })
                            }
                        >
                            <option value={1}>Class 1</option>
                            <option value={2}>Class 2</option>
                            <option value={3}>Class 3</option>
                            <option value={4}>Class 4</option>
                        </select>

                        <label>Category</label>

                        <select
                            value={editingPlayer.ageCategory}
                            onChange={(e) =>
                                setEditingPlayer({
                                    ...editingPlayer,
                                    ageCategory: e.target.value as AgeCategory,
                                })
                            }
                        >
                            <option value="herr">Herr</option>
                            <option value="dam">Dam</option>
                            <option value="junior">Junior</option>
                            <option value="minior">Minior</option>
                        </select>

                        <div className="modal-buttons">
                            <button
                                className="primary-action"
                                onClick={savePlayer}
                            >
                                Save
                            </button>

                            <button
                                className="secondary-action"
                                onClick={() => setEditingPlayer(null)}
                            >
                                Cancel
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
