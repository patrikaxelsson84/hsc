import { ArrowLeft, ArrowRight, Check, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ClassLevel, AgeCategory, PlayerScore } from "../lib/scoring";
import { titleToAgeCategory } from "../lib/scoring";
import { useLanguage } from "../lib/language";
import { usePlayers } from "../contexts/PlayersContext";
import { loadPendingChanges, resolveChange, applyAndApprove } from "../lib/pendingChanges";
import type { PendingChange } from "../lib/pendingChanges";
import { supabase } from "../lib/supabase";


export default function PlayersPage() {
    const { t } = useLanguage();
    const { players: basePlayers, loading, savePlayers, refresh } = usePlayers();

    const [players, setPlayers] = useState<PlayerScore[]>([]);

    useEffect(() => {
        if (loading) return;
        supabase.from('registrations').select('*').order('created_at').then(({ data }) => {
            const entries = (data ?? []) as { first_name: string; last_name: string; club: string; category: string; title: string; created_at: string }[];
            const registered: PlayerScore[] = entries.map((e) => ({
                id: `reg-${e.created_at}`,
                name: `${e.first_name} ${e.last_name}`.trim(),
                club: e.club ?? "",
                classLevel: (Number(e.category) || 4) as ClassLevel,
                ageCategory: titleToAgeCategory(e.title),
                rounds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                bonusHits: Array(10).fill(false),
                sevenMeters: 0,
            }));
            const registeredNames = new Set(registered.map((p) => p.name.toLowerCase()));
            const base = basePlayers.filter((p) => !registeredNames.has(p.name.toLowerCase()));
            setPlayers([...base, ...registered]);
        });
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
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    useEffect(() => {
        loadPendingChanges().then(setPendingChanges);
    }, []);

    async function handleApprove(change: PendingChange) {
        setResolvingId(change.id);
        await applyAndApprove(change);
        setPendingChanges((cur) => cur.filter((c) => c.id !== change.id));
        setResolvingId(null);
        // Refresh master player list
        await refresh();
    }

    async function handleReject(change: PendingChange) {
        setResolvingId(change.id);
        await resolveChange(change.id, "rejected");
        setPendingChanges((cur) => cur.filter((c) => c.id !== change.id));
        setResolvingId(null);
    }

    async function savePlayer() {
        if (!editingPlayer) return;
        setSaving(true);
        setSaveError(null);
        const updated = players.map((p) => p.id === editingPlayer.id ? editingPlayer : p);
        setPlayers(updated);
        // only save master-list players, not event registrations
        const toSave = updated.filter((p) => !p.id.startsWith("reg-"));
        try {
            await savePlayers(toSave);
            if (editingPlayer.club !== selectedTeam) setSelectedTeam(null);
            setEditingPlayer(null);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Kunde inte spara till GitHub");
        } finally {
            setSaving(false);
        }
    }

    const selectedPlayers = selectedTeam ? playersByTeam[selectedTeam] ?? [] : [];
    const selectedClassCount = new Set(selectedPlayers.map((p) => p.classLevel)).size;

    function changeLabel(c: PendingChange): string {
        if (c.change_type === "new_club")
            return `Ny klubb: ${c.player_name}${c.club_name && c.club_name !== "Ej angiven" ? ` — kontakt: ${c.club_name}` : ""}`;
        if (c.change_type === "delete")
            return `${c.club_name} vill ta bort ${c.player_name} (klass ${c.old_data?.classLevel ?? "?"}, ${c.old_data?.ageCategory ?? "?"})`;
        if (c.change_type === "add")
            return `${c.club_name} vill lägga till ${c.player_name} (klass ${c.new_data?.classLevel ?? "?"}, ${c.new_data?.ageCategory ?? "?"})`;
        if (c.change_type === "edit") {
            const parts: string[] = [];
            if (c.old_data?.name !== c.new_data?.name) parts.push(`namn: ${c.old_data?.name} → ${c.new_data?.name}`);
            if (c.old_data?.classLevel !== c.new_data?.classLevel) parts.push(`klass: ${c.old_data?.classLevel} → ${c.new_data?.classLevel}`);
            if (c.old_data?.ageCategory !== c.new_data?.ageCategory) parts.push(`kategori: ${c.old_data?.ageCategory} → ${c.new_data?.ageCategory}`);
            return `${c.club_name} vill ändra ${c.player_name}: ${parts.join(", ")}`;
        }
        return `${c.club_name}: ${c.change_type} ${c.player_name}`;
    }

    return (
        <div className="admin-page">
            {pendingChanges.length > 0 && (
                <section className="admin-panel pending-changes-panel">
                    <div className="panel-title-row">
                        <h2>Väntande ändringar från klubbar</h2>
                        <span className="success-pill" style={{ background: "var(--color-warning, #b45309)", color: "#fff" }}>
                            {pendingChanges.length} st
                        </span>
                    </div>
                    <ul className="pending-changes-list">
                        {pendingChanges.map((c) => (
                            <li key={c.id} className="pending-change-row">
                                <span className={`pending-change-type pending-type-${c.change_type}`}>
                                    {c.change_type === "delete" ? "Ta bort"
                                        : c.change_type === "add" ? "Lägg till"
                                        : c.change_type === "new_club" ? "Ny klubb"
                                        : "Ändra"}
                                </span>
                                <span className="pending-change-desc">{changeLabel(c)}</span>
                                <div className="pending-change-actions">
                                    <button
                                        className="primary-action score-button"
                                        type="button"
                                        disabled={resolvingId === c.id}
                                        onClick={() => handleApprove(c)}
                                    >
                                        <Check size={14} aria-hidden="true" />
                                        Godkänn
                                    </button>
                                    <button
                                        className="danger-action score-button"
                                        type="button"
                                        disabled={resolvingId === c.id}
                                        onClick={() => handleReject(c)}
                                    >
                                        <X size={14} aria-hidden="true" />
                                        Avvisa
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
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

            {saveError && (
                <p style={{ color: "var(--color-error, red)", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
                    ⚠ GitHub-fel: {saveError}
                </p>
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
                            <button className="primary-action" onClick={savePlayer} disabled={saving}>
                                {saving ? "Sparar…" : t.players_save}
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
