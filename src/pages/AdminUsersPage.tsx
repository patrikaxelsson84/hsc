import { AlertTriangle, Check, ChevronRight, Lock, Plus, RefreshCw, Save, ShieldOff, Trash2, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { addClub, getActiveLockouts, listClubsWithInfo, removeClub, setAdminPassword, setAdminUsername, setClubPassword, setClubUsername, unlockAccount, type ClubInfo, type LockoutRecord } from "../lib/auth";
import { useLanguage } from "../lib/language";
import { supabase } from "../lib/supabase";

type ClubRequest = {
    id: string;
    club_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
    city: string | null;
    status: string;
    created_at: string;
};

type ClubProfile = {
    id: string;
    contact_name: string;
    email: string;
    phone: string;
    city: string;
    notes: string;
    created_at?: string;
};

export default function AdminUsersPage() {
    const { t, lang } = useLanguage();

    const [requests,    setRequests]    = useState<ClubRequest[]>([]);
    const [reqLoading,  setReqLoading]  = useState(true);
    const [clubs,       setClubs]       = useState<ClubInfo[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [newClubName, setNewClubName] = useState("");
    const [newClubPw,   setNewClubPw]   = useState("");

    const [resetClub,   setResetClub]   = useState<string | null>(null);
    const [resetPw,     setResetPw]     = useState("");
    const [resetStatus, setResetStatus] = useState<Record<string, "ok" | "idle">>({});

    const [adminPw,     setAdminPw]     = useState("");
    const [adminStatus, setAdminStatus] = useState<"idle" | "ok">("idle");

    const [adminUser,       setAdminUser]       = useState("");
    const [adminUserStatus, setAdminUserStatus] = useState<"idle" | "ok">("idle");

    const [lockouts,    setLockouts]    = useState<LockoutRecord[]>([]);

    const [profileClub,       setProfileClub]       = useState<string | null>(null);
    const [profile,           setProfile]           = useState<ClubProfile | null>(null);
    const [profileLoading,    setProfileLoading]    = useState(false);
    const [profileSaving,     setProfileSaving]     = useState(false);
    const [profileStatus,     setProfileStatus]     = useState<"idle" | "ok">("idle");
    const [drawerUsername,    setDrawerUsername]    = useState("");
    const [drawerUserSaving,  setDrawerUserSaving]  = useState(false);
    const [drawerUserStatus,  setDrawerUserStatus]  = useState<"idle" | "ok">("idle");

    useEffect(() => { refresh(); refreshRequests(); refreshLockouts(); }, []);

    async function refreshLockouts() {
        setLockouts(await getActiveLockouts());
    }

    async function handleUnlock(id: string) {
        await unlockAccount(id);
        await refreshLockouts();
    }

    async function openProfile(clubId: string) {
        setProfileClub(clubId);
        setProfileLoading(true);
        setProfileStatus("idle");
        setDrawerUserStatus("idle");
        const [{ data }, { data: cred }] = await Promise.all([
            supabase.from("club_profiles").select("*").eq("id", clubId).maybeSingle(),
            supabase.from("credentials").select("username").eq("id", clubId).eq("type", "club").maybeSingle(),
        ]);
        setProfile({
            id:           clubId,
            contact_name: data?.contact_name ?? "",
            email:        data?.email        ?? "",
            phone:        data?.phone        ?? "",
            city:         data?.city         ?? "",
            notes:        data?.notes        ?? "",
            created_at:   data?.created_at,
        });
        setDrawerUsername(cred?.username ?? "");
        setProfileLoading(false);
    }

    function closeProfile() {
        setProfileClub(null);
        setProfile(null);
        setProfileStatus("idle");
        setDrawerUserStatus("idle");
    }

    async function saveDrawerUsername() {
        if (!profileClub) return;
        setDrawerUserSaving(true);
        await setClubUsername(profileClub, drawerUsername);
        setDrawerUserSaving(false);
        setDrawerUserStatus("ok");
        setClubs((prev) => prev.map((c) => c.id === profileClub ? { ...c, username: drawerUsername.trim() || null } : c));
        setTimeout(() => setDrawerUserStatus("idle"), 2500);
    }

    async function saveProfile() {
        if (!profile) return;
        setProfileSaving(true);
        await supabase.from("club_profiles").upsert(
            { ...profile, updated_at: new Date().toISOString() },
            { onConflict: "id" }
        );
        setProfileSaving(false);
        setProfileStatus("ok");
        setTimeout(() => setProfileStatus("idle"), 2500);
    }

    async function refresh() {
        setLoading(true);
        setClubs(await listClubsWithInfo());
        setLoading(false);
    }

    async function refreshRequests() {
        setReqLoading(true);
        const { data } = await supabase
            .from("club_requests")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: true });
        setRequests(data ?? []);
        setReqLoading(false);
    }

    async function handleApprove(req: ClubRequest) {
        await addClub(req.club_name, "1337");
        await supabase.from("club_requests").update({ status: "approved" }).eq("id", req.id);
        await supabase.from("club_profiles").upsert({
            id:           req.club_name,
            contact_name: req.contact_name,
            email:        req.email,
            phone:        req.phone  ?? "",
            city:         req.city   ?? "",
            notes:        "",
            updated_at:   new Date().toISOString(),
        }, { onConflict: "id", ignoreDuplicates: true });
        await Promise.all([refresh(), refreshRequests()]);
    }

    async function handleReject(id: string) {
        await supabase.from("club_requests").update({ status: "rejected" }).eq("id", id);
        await refreshRequests();
    }

    async function handleAddClub() {
        const name = newClubName.trim();
        const pw   = newClubPw.trim() || "1337";
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

    async function handleAdminUser() {
        if (!adminUser.trim()) return;
        await setAdminUsername(adminUser.trim());
        setAdminUser("");
        setAdminUserStatus("ok");
        setTimeout(() => setAdminUserStatus("idle"), 2500);
    }

    return (
        <>
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">{t.admin_users_eyebrow}</p>
                    <h1>{t.admin_users_heading}</h1>
                    <p>{t.admin_users_desc}</p>
                </div>
            </div>

            {/* ── Locked accounts ── */}
            {lockouts.length > 0 && (
                <section className="admin-panel" style={{ borderColor: "var(--danger, #e53e3e)" }}>
                    <div className="panel-title-row">
                        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <AlertTriangle size={18} style={{ color: "var(--danger, #e53e3e)" }} aria-hidden="true" />
                            {lang === "sv" ? "Låsta inloggningar" : "Locked accounts"}
                        </h2>
                        <span className="club-tab-count">{lockouts.length}</span>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                        {lang === "sv"
                            ? "Dessa konton är tillfälligt låsta efter upprepade misslyckade inloggningsförsök."
                            : "These accounts are temporarily locked after repeated failed login attempts."}
                    </p>
                    <div className="table-shell">
                        <table>
                            <thead>
                                <tr>
                                    <th>{lang === "sv" ? "Konto" : "Account"}</th>
                                    <th>{lang === "sv" ? "Försök" : "Attempts"}</th>
                                    <th>{lang === "sv" ? "Låst till" : "Locked until"}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lockouts.map((row) => {
                                    const until = new Date(row.locked_until!);
                                    const minutesLeft = Math.ceil((until.getTime() - Date.now()) / 60_000);
                                    return (
                                        <tr key={row.id}>
                                            <td><strong>{row.id}</strong></td>
                                            <td>{row.failed_attempts}</td>
                                            <td style={{ whiteSpace: "nowrap", fontSize: "0.85em", color: "var(--muted)" }}>
                                                {until.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                                                {" "}({minutesLeft} {lang === "sv" ? "min kvar" : "min left"})
                                            </td>
                                            <td style={{ whiteSpace: "nowrap" }}>
                                                <button
                                                    type="button"
                                                    className="secondary-action score-button"
                                                    onClick={() => handleUnlock(row.id)}
                                                >
                                                    <ShieldOff size={14} aria-hidden="true" />
                                                    {lang === "sv" ? "Lås upp" : "Unlock"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ── Club applications ── */}
            <section className="admin-panel">
                <div className="panel-title-row">
                    <h2>{t.admin_requests_heading}</h2>
                    {requests.length > 0 && (
                        <span className="club-tab-count">{requests.length} {t.admin_requests_pending}</span>
                    )}
                </div>
                {reqLoading ? (
                    <p className="club-empty">…</p>
                ) : requests.length === 0 ? (
                    <p className="club-empty">{t.admin_requests_empty}</p>
                ) : (
                    <div className="table-shell">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t.admin_requests_col_club}</th>
                                    <th>{t.admin_requests_col_contact}</th>
                                    <th>{t.admin_requests_col_email}</th>
                                    <th>{t.admin_requests_col_phone}</th>
                                    <th>{t.admin_requests_col_city}</th>
                                    <th>{t.admin_requests_col_date}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id}>
                                        <td><strong>{req.club_name}</strong></td>
                                        <td>{req.contact_name}</td>
                                        <td>{req.email}</td>
                                        <td>{req.phone ?? "—"}</td>
                                        <td>{req.city ?? "—"}</td>
                                        <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: "0.85em" }}>
                                            {new Date(req.created_at).toLocaleDateString("sv-SE")}
                                        </td>
                                        <td style={{ whiteSpace: "nowrap" }}>
                                            <span style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                <button
                                                    type="button"
                                                    className="primary-action score-button"
                                                    onClick={() => handleApprove(req)}
                                                >
                                                    <Check size={14} />
                                                    {t.admin_requests_approve}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="comp-delete-btn"
                                                    onClick={() => handleReject(req.id)}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

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
                            placeholder={t.admin_users_club_pw_ph + " (default: 1337)"}
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
                                    <th>{lang === "sv" ? "Användarnamn" : "Username"}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {clubs.map((club) => (
                                    <tr key={club.id}>
                                        <td>
                                            <button
                                                type="button"
                                                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 600, color: "inherit" }}
                                                onClick={() => openProfile(club.id)}
                                            >
                                                {club.id}
                                                <ChevronRight size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                                            </button>
                                        </td>
                                        <td style={{ fontSize: "0.875rem", color: club.username ? "inherit" : "var(--muted)" }}>
                                            {club.username ?? (lang === "sv" ? "Ej satt" : "Not set")}
                                        </td>
                                        <td style={{ whiteSpace: "nowrap" }}>
                                            {resetClub === club.id ? (
                                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                                    <input
                                                        type="text"
                                                        style={{ flex: 1, minWidth: 0 }}
                                                        placeholder={t.admin_users_club_pw_ph}
                                                        value={resetPw}
                                                        autoFocus
                                                        onChange={(e) => setResetPw(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleResetPw(club.id)}
                                                    />
                                                    <button type="button" className="primary-action score-button"
                                                        onClick={() => handleResetPw(club.id)}>
                                                        <Save size={14} />
                                                    </button>
                                                    <button type="button" className="secondary-action score-button"
                                                        onClick={() => { setResetClub(null); setResetPw(""); }}>
                                                        {lang === "sv" ? "Avbryt" : "Cancel"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                    {resetStatus[club.id] === "ok" && (
                                                        <span className="success-pill" style={{ fontSize: "0.75rem" }}>
                                                            {t.admin_users_saved}
                                                        </span>
                                                    )}
                                                    <button type="button" className="secondary-action score-button"
                                                        onClick={() => { setResetClub(club.id); setResetPw(""); }}>
                                                        <RefreshCw size={14} aria-hidden="true" />
                                                        {t.admin_users_reset_pw}
                                                    </button>
                                                    <button type="button" className="comp-delete-btn"
                                                        aria-label={`${t.admin_users_remove} ${club.id}`}
                                                        onClick={() => handleRemoveClub(club.id)}>
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

            {/* ── Admin credentials ── */}
            <section className="admin-panel" style={{ maxWidth: 420 }}>
                <div className="panel-title-row">
                    <h2>{t.admin_users_admin_heading}</h2>
                </div>

                {/* Username */}
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "0.75rem" }}>
                    <label style={{ flex: 1 }}>
                        {lang === "sv" ? "Nytt användarnamn" : "New username"}
                        <div className="club-login-field">
                            <User size={16} aria-hidden="true" />
                            <input
                                type="text"
                                placeholder={lang === "sv" ? "Nytt användarnamn" : "New username"}
                                value={adminUser}
                                onChange={(e) => { setAdminUser(e.target.value); setAdminUserStatus("idle"); }}
                                onKeyDown={(e) => e.key === "Enter" && handleAdminUser()}
                            />
                        </div>
                    </label>
                    <button type="button" className="primary-action score-button"
                        style={{ marginBottom: 1 }}
                        disabled={!adminUser.trim()}
                        onClick={handleAdminUser}>
                        <Save size={16} aria-hidden="true" />
                        {adminUserStatus === "ok" ? t.admin_users_saved : (lang === "sv" ? "Spara" : "Save")}
                    </button>
                </div>

                {/* Password */}
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

        {/* ── Club profile drawer ── */}
        {profileClub && (
            <>
                {/* Backdrop */}
                <div
                    onClick={closeProfile}
                    style={{
                        position: "fixed", inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        zIndex: 200,
                    }}
                />
                {/* Panel */}
                <div style={{
                    position: "fixed", top: 0, right: 0, bottom: 0,
                    width: "min(420px, 100vw)",
                    background: "var(--surface, #fff)",
                    boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
                    zIndex: 201,
                    display: "flex", flexDirection: "column",
                    overflowY: "auto",
                }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
                        <div>
                            <p className="eyebrow" style={{ marginBottom: "0.1rem" }}>{lang === "sv" ? "Klubbinfo" : "Club info"}</p>
                            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{profileClub}</h2>
                        </div>
                        <button type="button" onClick={closeProfile} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: "1.25rem 1.5rem", flex: 1 }}>
                        {profileLoading ? (
                            <p style={{ color: "var(--muted)" }}>…</p>
                        ) : profile ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.875rem", fontWeight: 500 }}>
                                    {lang === "sv" ? "Användarnamn (inloggning)" : "Username (login)"}
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <input
                                            type="text"
                                            value={drawerUsername}
                                            placeholder="••••••••"
                                            style={{ flex: 1 }}
                                            onChange={(e) => { setDrawerUsername(e.target.value); setDrawerUserStatus("idle"); }}
                                            onKeyDown={(e) => e.key === "Enter" && saveDrawerUsername()}
                                        />
                                        <button type="button" className="primary-action score-button"
                                            disabled={drawerUserSaving}
                                            onClick={saveDrawerUsername}
                                            title={lang === "sv" ? "Spara användarnamn" : "Save username"}>
                                            {drawerUserStatus === "ok" ? <Check size={14} /> : <Save size={14} />}
                                        </button>
                                    </div>
                                </label>
                                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.25rem 0" }} />
                                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.875rem", fontWeight: 500 }}>
                                    {lang === "sv" ? "Kontaktperson" : "Contact name"}
                                    <input
                                        type="text"
                                        value={profile.contact_name}
                                        placeholder="—"
                                        onChange={(e) => setProfile((p) => p ? { ...p, contact_name: e.target.value } : p)}
                                    />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.875rem", fontWeight: 500 }}>
                                    {lang === "sv" ? "E-post" : "Email"}
                                    <input
                                        type="email"
                                        value={profile.email}
                                        placeholder="—"
                                        onChange={(e) => setProfile((p) => p ? { ...p, email: e.target.value } : p)}
                                    />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.875rem", fontWeight: 500 }}>
                                    {lang === "sv" ? "Telefon" : "Phone"}
                                    <input
                                        type="tel"
                                        value={profile.phone}
                                        placeholder="—"
                                        onChange={(e) => setProfile((p) => p ? { ...p, phone: e.target.value } : p)}
                                    />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.875rem", fontWeight: 500 }}>
                                    {lang === "sv" ? "Ort" : "City"}
                                    <input
                                        type="text"
                                        value={profile.city}
                                        placeholder="—"
                                        onChange={(e) => setProfile((p) => p ? { ...p, city: e.target.value } : p)}
                                    />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.875rem", fontWeight: 500 }}>
                                    {lang === "sv" ? "Anteckningar" : "Notes"}
                                    <textarea
                                        rows={3}
                                        value={profile.notes}
                                        placeholder="—"
                                        style={{ resize: "vertical" }}
                                        onChange={(e) => setProfile((p) => p ? { ...p, notes: e.target.value } : p)}
                                    />
                                </label>
                                {profile.created_at && (
                                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
                                        {lang === "sv" ? "Tillagd" : "Added"}{" "}
                                        {new Date(profile.created_at).toLocaleDateString("sv-SE")}
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <button
                            type="button"
                            className="primary-action score-button"
                            disabled={profileSaving || profileLoading}
                            onClick={saveProfile}
                        >
                            <Save size={15} aria-hidden="true" />
                            {profileSaving ? "…" : profileStatus === "ok" ? (lang === "sv" ? "Sparat!" : "Saved!") : (lang === "sv" ? "Spara" : "Save")}
                        </button>
                        <button type="button" className="secondary-action score-button" onClick={closeProfile}>
                            {lang === "sv" ? "Stäng" : "Close"}
                        </button>
                    </div>
                </div>
            </>
        )}
        </>
    );
}
