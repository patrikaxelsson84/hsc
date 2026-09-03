import { Lock, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { addClub, listClubs, removeClub, setAdminPassword, setClubPassword } from "../lib/auth";
import { useLanguage } from "../lib/language";

export default function AdminUsersPage() {
    const { t, lang } = useLanguage();

    const [clubs,       setClubs]       = useState<string[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [newClubName, setNewClubName] = useState("");
    const [newClubPw,   setNewClubPw]   = useState("");

    const [resetClub,   setResetClub]   = useState<string | null>(null);
    const [resetPw,     setResetPw]     = useState("");
    const [resetStatus, setResetStatus] = useState<Record<string, "ok" | "idle">>({});

    const [adminPw,     setAdminPw]     = useState("");
    const [adminStatus, setAdminStatus] = useState<"idle" | "ok">("idle");

    useEffect(() => { refresh(); }, []);

    async function refresh() {
        setLoading(true);
        setClubs(await listClubs());
        setLoading(false);
    }

    async function handleAddClub() {
        const name = newClubName.trim();
        const pw   = newClubPw.trim() || "123";
        if (!name) return;
        await addClub(name, pw);
        setNewClubName("");
        setNewClubPw("");
        await refresh();
    }

    async function handleRemoveClub(club: string) {
        const msg = lang === "sv"
            ? `Ta bort klubben "${club}"? Alla inloggningsuppgifter raderas.`
            : `Remove club "${club}"? All login credentials will be deleted.`;
        if (!window.confirm(msg)) return;
        await removeClub(club);
        await refresh();
    }

    async function handleResetPw(club: string) {
        if (!resetPw.trim()) return;
        await setClubPassword(club, resetPw.trim());
        setResetClub(null);
        setResetPw("");
        setResetStatus((s) => ({ ...s, [club]: "ok" }));
        setTimeout(() => setResetStatus((s) => ({ ...s, [club]: "idle" })), 2500);
    }

    async function handleAdminPw() {
        if (!adminPw.trim()) return;
        await setAdminPassword(adminPw.trim());
        setAdminPw("");
        setAdminStatus("ok");
        setTimeout(() => setAdminStatus("idle"), 2500);
    }

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">{t.admin_users_eyebrow}</p>
                    <h1>{t.admin_users_heading}</h1>
                    <p>{t.admin_users_desc}</p>
                </div>
            </div>

            {/* ── Club accounts ── */}
            <section className="admin-panel">
                <div className="panel-title-row">
                    <h2>{t.admin_users_clubs_heading}</h2>
                    <span className="club-tab-count">{clubs.length}</span>
                </div>

                {/* Add club form */}
                <div className="comp-form-grid" style={{ marginBottom: "1.25rem" }}>
                    <label>
                        {t.admin_users_add_club}
                        <input
                            type="text"
                            placeholder={t.admin_users_club_name_ph}
                            value={newClubName}
                            onChange={(e) => setNewClubName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddClub()}
                        />
                    </label>
                    <label>
                        {t.club_login_pass}
                        <input
                            type="text"
                            placeholder={t.admin_users_club_pw_ph + " (default: 123)"}
                            value={newClubPw}
                            onChange={(e) => setNewClubPw(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddClub()}
                        />
                    </label>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button
                            type="button"
                            className="primary-action score-button"
                            disabled={!newClubName.trim()}
                            onClick={handleAddClub}
                        >
                            <Plus size={16} aria-hidden="true" />
                            {t.admin_users_add_btn}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <p className="club-empty">…</p>
                ) : clubs.length === 0 ? (
                    <p className="club-empty">{t.admin_users_no_clubs}</p>
                ) : (
                    <div className="table-shell">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t.comps_col_name}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {clubs.map((club) => (
                                    <tr key={club}>
                                        <td><strong>{club}</strong></td>
                                        <td style={{ whiteSpace: "nowrap" }}>
                                            {resetClub === club ? (
                                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                                    <input
                                                        type="text"
                                                        style={{ flex: 1, minWidth: 0 }}
                                                        placeholder={t.admin_users_club_pw_ph}
                                                        value={resetPw}
                                                        autoFocus
                                                        onChange={(e) => setResetPw(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleResetPw(club)}
                                                    />
                                                    <button type="button" className="primary-action score-button"
                                                        onClick={() => handleResetPw(club)}>
                                                        <Save size={14} />
                                                    </button>
                                                    <button type="button" className="secondary-action score-button"
                                                        onClick={() => { setResetClub(null); setResetPw(""); }}>
                                                        {lang === "sv" ? "Avbryt" : "Cancel"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                    {resetStatus[club] === "ok" && (
                                                        <span className="success-pill" style={{ fontSize: "0.75rem" }}>
                                                            {t.admin_users_saved}
                                                        </span>
                                                    )}
                                                    <button type="button" className="secondary-action score-button"
                                                        onClick={() => { setResetClub(club); setResetPw(""); }}>
                                                        <RefreshCw size={14} aria-hidden="true" />
                                                        {t.admin_users_reset_pw}
                                                    </button>
                                                    <button type="button" className="comp-delete-btn"
                                                        aria-label={`${t.admin_users_remove} ${club}`}
                                                        onClick={() => handleRemoveClub(club)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ── Admin password ── */}
            <section className="admin-panel" style={{ maxWidth: 420 }}>
                <div className="panel-title-row">
                    <h2>{t.admin_users_admin_heading}</h2>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                    <label style={{ flex: 1 }}>
                        {t.admin_users_admin_new}
                        <div className="club-login-field">
                            <Lock size={16} aria-hidden="true" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={adminPw}
                                onChange={(e) => { setAdminPw(e.target.value); setAdminStatus("idle"); }}
                                onKeyDown={(e) => e.key === "Enter" && handleAdminPw()}
                            />
                        </div>
                    </label>
                    <button type="button" className="primary-action score-button"
                        style={{ marginBottom: 1 }}
                        disabled={!adminPw.trim()}
                        onClick={handleAdminPw}>
                        <Save size={16} aria-hidden="true" />
                        {adminStatus === "ok" ? t.admin_users_saved : t.admin_users_admin_save}
                    </button>
                </div>
            </section>
        </div>
    );
}
