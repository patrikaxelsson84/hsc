import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { ClassLevel, AgeCategory, PlayerScore } from "../lib/scoring";
import { useLanguage } from "../lib/language";
import { usePlayers } from "../contexts/PlayersContext";

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

function mergeWithRegistered(basePlayers: PlayerScore[]): PlayerScore[] {
    const registered = loadRegisteredPlayers();
    const registeredIds = new Set(registered.map((p) => p.name.toLowerCase()));
    const base = basePlayers.filter((p) => !registeredIds.has(p.name.toLowerCase()));
    return [...base, ...registered];
}

export default function PlayersPage() {
    const { t } = useLanguage();
    const { players: basePlayers, loading, savePlayers } = usePlayers();

    const [players, setPlayers] = useState<PlayerScore[]>([]);

    useEffect(() => {
        if (!loading) setPlayers(mergeWithRegistered(basePlayers));
    }, [loading, basePlayers]);

    const sortedPlayers = [...players].sort((a, b) => {
        const teamCompare = a.club.localeCompare(b.club);
        if (teamCompare !== 0) return teamCompare;
        if (a.classLevel !== b.classLevel) return a.classLevel - b.classLevel;
        return a.name.localeCompare(b.name);
    });

    const playersByTeam = sortedPlayers.reduce<Record<string, PlayerScore[]>>(
        (teams, player) => {
            const team = player.club || t.players_no_team;
            teams[team] ??= [];
            teams[team].push(player);
            return teams;
        },
        {}
    );

    const teamGroups = Object.entries(playersByTeam).sort(([a], [b]) => a.localeCompare(b));

    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [editingPlayer, setEditingPlayer] = useState<PlayerScore | null>(null);

    function savePlayer() {
        if (!editingPlayer) return;
        const updated = players.map((p) => p.id === editingPlayer.id ? editingPlayer : p);
        setPlayers(updated);
        savePlayers(updated);
        if (editingPlayer.club !== selectedTeam) setSelectedTeam(null);
        setEditingPlayer(null);
    }

    const selectedPlayers = selectedTeam ? playersByTeam[selectedTeam] ?? [] : [];
    const selectedClassCount = new Set(selectedPlayers.map((p) => p.classLevel)).size;

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">{t.players_eyebrow}</p>
                    <h1>{selectedTeam ?? t.players_clubs_heading}</h1>
                    <p>{selectedTeam ? t.players_team_desc : t.players_club_desc}</p>
                </div>
                {selectedTeam && (
                    <button
                        className="secondary-action roster-back-button"
                        type="button"
                        onClick={() => setSelectedTeam(null)}
                    >
                        <ArrowLeft size={17} aria-hidden="true" />
                        {t.players_all_clubs}
                    </button>
                )}
            </div>

            {selectedTeam ? (
                <section className="team-roster-list" aria-label={`${selectedTeam}`}>
                    <article className="team-roster-group">
                        <div className="team-roster-header">
                            <div>
                                <h2>{selectedTeam}</h2>
                                <p>
                                    {selectedPlayers.length}{" "}
                                    {selectedPlayers.length === 1
                                        ? t.players_player_s
                                        : t.players_player_p}
                                </p>
                            </div>
                            <span className="success-pill">
                                {selectedClassCount} {t.players_classes_sfx}
                            </span>
                        </div>

                        <div className="table-shell">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t.players_col_class}</th>
                                        <th>{t.players_col_name}</th>
                                        <th>{t.players_col_category}</th>
                                        <th>{t.players_col_7m}</th>
                                        <th>{t.players_col_actions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPlayers.map((player) => (
                                        <tr key={player.id}>
                                            <td>{t.players_class_prefix} {player.classLevel}</td>
                                            <td>{player.name}</td>
                                            <td>{player.ageCategory}</td>
                                            <td>{player.sevenMeters}</td>
                                            <td>
                                                <button
                                                    className="secondary-action"
                                                    onClick={() => setEditingPlayer(player)}
                                                >
                                                    {t.players_edit_btn}
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
                <section className="club-grid" aria-label={t.players_clubs_heading}>
                    {teamGroups.map(([team, members]) => (
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
                                    {members.length}{" "}
                                    {members.length === 1 ? t.players_member_s : t.players_member_p}
                                    {" · "}
                                    {new Set(members.map((p) => p.classLevel)).size}{" "}
                                    {t.players_classes_sfx}
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
                        <h2>{t.players_edit_btn} — {editingPlayer.name}</h2>

                        <label>{t.players_label_name}</label>
                        <input
                            value={editingPlayer.name}
                            onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                        />

                        <label>{t.players_label_club}</label>
                        <select
                            value={editingPlayer.club}
                            onChange={(e) => setEditingPlayer({ ...editingPlayer, club: e.target.value })}
                        >
                            {teamGroups.map(([team]) => (
                                <option key={team} value={team}>{team}</option>
                            ))}
                        </select>

                        <label>{t.players_label_class}</label>
                        <select
                            value={editingPlayer.classLevel}
                            onChange={(e) =>
                                setEditingPlayer({
                                    ...editingPlayer,
                                    classLevel: Number(e.target.value) as ClassLevel,
                                })
                            }
                        >
                            <option value={1}>{t.players_class_prefix} 1</option>
                            <option value={2}>{t.players_class_prefix} 2</option>
                            <option value={3}>{t.players_class_prefix} 3</option>
                            <option value={4}>{t.players_class_prefix} 4</option>
                        </select>

                        <label>{t.players_label_category}</label>
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
                            <button className="primary-action" onClick={savePlayer}>
                                {t.players_save}
                            </button>
                            <button className="secondary-action" onClick={() => setEditingPlayer(null)}>
                                {t.players_cancel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
