import { ArrowLeft, Camera, ClipboardList, FileSpreadsheet, Inbox, Lock, LogIn, Pencil, Play, Plus, Save, Send, Settings, Trash2, Trophy, Users } from "lucide-react";
import { printProtokoll, printStartordning, printLaguppställning } from "../lib/printProtokoll";
import { extractScoresFromImage } from "../lib/importFromPhoto";
import type { RecognizedScore } from "../lib/importFromPhoto";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { loadCompetitions } from "../data/competitions";
import LangSelect from "../components/LangSelect";
import { useLanguage } from "../lib/language";
import type { AgeCategory, ClassLevel, PlayerScore } from "../lib/scoring";
import { rankPlayers, rankTeams } from "../lib/scoring";
import { usePlayers } from "../contexts/PlayersContext";
import { checkClubPassword, ensureClubsExist, listClubs, setClubPassword } from "../lib/auth";
import { supabase } from "../lib/supabase";

// ── Constants ────────────────────────────────────────────────────────────────

const CLUB_SESSION_KEY  = "hsc-club-session";
const ROSTERS_KEY       = "hsc-club-rosters";
const REGISTRATIONS_KEY = "hsc-registrations";

// ── Types ────────────────────────────────────────────────────────────────────

interface ClubPlayer {
    id: string;
    name: string;
    club: string;
    classLevel: ClassLevel;
    ageCategory: AgeCategory;
}

interface RegEntry {
    id?: string;
    firstName: string;
    lastName: string;
    club: string;
    category: string;
    title: string;
    createdAt: string;
    competitionId?: string;
    pairWith?: string;
    teamId?: string;
}

function rowToRegEntry(row: Record<string, unknown>): RegEntry {
    return {
        id:            row.id as string,
        firstName:     (row.first_name  as string) ?? '',
        lastName:      (row.last_name   as string) ?? '',
        club:          (row.club        as string) ?? '',
        category:      (row.category    as string) ?? '',
        title:         (row.title       as string) ?? '',
        createdAt:     (row.created_at  as string) ?? new Date().toISOString(),
        competitionId: (row.competition_id as string | null) ?? undefined,
        pairWith:      (row.pair_with   as string | null) ?? undefined,
        teamId:        (row.team_id     as string | null) ?? undefined,
    };
}

function regEntryToRow(entry: Partial<RegEntry>): Record<string, unknown> {
    return {
        first_name:    entry.firstName,
        last_name:     entry.lastName,
        club:          entry.club,
        category:      entry.category,
        title:         entry.title     ?? null,
        competition_id: entry.competitionId ?? null,
        pair_with:     entry.pairWith  ?? null,
        team_id:       entry.teamId    ?? null,
    };
}

// ── Credentials — delegated to auth.ts ───────────────────────────────────────

// ── Roster storage ───────────────────────────────────────────────────────────

function loadClubRoster(clubName: string, basePlayers: PlayerScore[]): ClubPlayer[] {
    try {
        const stored: Record<string, ClubPlayer[]> = JSON.parse(localStorage.getItem(ROSTERS_KEY) ?? "{}");
        if (stored[clubName]) return stored[clubName];
    } catch { /* fall through */ }
    const seeded = basePlayers
        .filter((p) => p.club.toLowerCase() === clubName.toLowerCase())
        .map((p) => ({ id: p.id, name: p.name, club: p.club, classLevel: p.classLevel, ageCategory: p.ageCategory }));
    saveClubRoster(clubName, seeded);
    return seeded;
}

function saveClubRoster(clubName: string, roster: ClubPlayer[]) {
    try {
        const stored: Record<string, ClubPlayer[]> = JSON.parse(localStorage.getItem(ROSTERS_KEY) ?? "{}");
        stored[clubName] = roster;
        localStorage.setItem(ROSTERS_KEY, JSON.stringify(stored));
    } catch { /* empty */ }
}

function getSavedSession(): string | null {
    return sessionStorage.getItem(CLUB_SESSION_KEY);
}

function ageCatLabel(cat: AgeCategory, t: ReturnType<typeof useLanguage>["t"]): string {
    if (cat === "dam")    return t.reg_mrs;
    if (cat === "junior") return t.reg_junior;
    if (cat === "minior") return t.reg_minior;
    return t.reg_mr;
}

// ── Login screen ─────────────────────────────────────────────────────────────

function ClubLogin({ onLogin, knownClubs }: { onLogin: (clubName: string) => void; knownClubs: string[] }) {
    const { t } = useLanguage();
    const [club,      setClub]      = useState("");
    const [password,  setPassword]  = useState("");
    const [error,     setError]     = useState(false);
    const [loading,   setLoading]   = useState(false);
    const [authClubs, setAuthClubs] = useState<string[]>([]);

    useEffect(() => {
        ensureClubsExist(knownClubs);
        listClubs().then(setAuthClubs);
    }, [knownClubs]);

    const allClubs = [...new Set([...knownClubs, ...authClubs])].sort((a, b) => a.localeCompare(b, "sv"));

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!club) return;
        setLoading(true);
        if (await checkClubPassword(club, password)) {
            sessionStorage.setItem(CLUB_SESSION_KEY, club);
            onLogin(club);
        } else {
            setError(true);
            setPassword("");
        }
        setLoading(false);
    }

    return (
        <main className="public-page">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="HSC home">
                    <span className="brand-mark">HSC</span>
                    <span>{t.brand_subtitle}</span>
                </Link>
                <a className="svhkf-logo-link" href="https://www.svhkf.se/" target="_blank" rel="noopener noreferrer">
                    <img className="svhkf-logo" src="/svhkf-logo.png" alt="Sv HKF" />
                </a>
                <LangSelect />
            </header>

            <div className="club-login-shell">
                <div className="club-login-card">
                    <div className="club-login-icon"><Lock size={28} /></div>
                    <p className="eyebrow">{t.club_eyebrow}</p>
                    <h1>{t.club_login_heading}</h1>
                    <p className="club-login-desc">{t.club_login_desc}</p>

                    <form className="club-login-form" onSubmit={handleSubmit}>
                        <label>
                            {t.club_login_user}
                            <div className="club-login-field club-login-field--select">
                                <Users size={16} aria-hidden="true" />
                                <select required value={club}
                                    onChange={(e) => { setClub(e.target.value); setError(false); }}>
                                    <option value="" disabled>{t.club_login_user_ph}</option>
                                    {allClubs.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </label>
                        <label>
                            {t.club_login_pass}
                            <div className="club-login-field">
                                <Lock size={16} aria-hidden="true" />
                                <input type="password" autoComplete="current-password" required
                                    value={password} placeholder="••••••••"
                                    onChange={(e) => { setPassword(e.target.value); setError(false); }} />
                            </div>
                        </label>
                        {error && <p className="club-login-error">{t.club_login_error}</p>}
                        <button className="primary-action club-login-btn" type="submit" disabled={loading}>
                            <LogIn size={18} aria-hidden="true" />
                            {loading ? "…" : t.club_login_btn}
                        </button>
                    </form>

                    <Link className="back-link club-login-back" to="/">
                        <ArrowLeft size={15} aria-hidden="true" />
                        {t.club_back}
                    </Link>
                </div>
            </div>
        </main>
    );
}

// ── Organizer match ───────────────────────────────────────────────────────────

function normClub(name: string) {
    return name.toLowerCase().replace(/\s+(hsk|hsc|if|fk)\s*$/i, "").trim();
}

function isOrganizerOf(competitionOrganizer: string, clubName: string): boolean {
    if (!competitionOrganizer) return false;
    const a = normClub(competitionOrganizer);
    const b = normClub(clubName);
    return a === b || a.includes(b) || b.includes(a);
}

// ── Pair / team types ─────────────────────────────────────────────────────────

type PairCat = "mix-d" | "dubbel" | "mr-d" | "mrs-d" | "team-g" | "lag";
const PAIR_CATS: string[] = ["mix-d", "dubbel", "mr-d", "mrs-d", "team-g", "lag"];
const PAIR_TYPES: { id: PairCat; sv: string; en: string; size: 2 | 4 }[] = [
    { id: "mix-d",  sv: "Mixed",      en: "Mixed",       size: 2 },
    { id: "dubbel", sv: "Dubbel",     en: "Doubles",     size: 2 },
    { id: "mr-d",   sv: "Mr Dubbel",  en: "Mr Doubles",  size: 2 },
    { id: "mrs-d",  sv: "Mrs Dubbel", en: "Mrs Doubles", size: 2 },
    { id: "team-g", sv: "Lag",        en: "Team",        size: 4 },
];

// ── Incoming registrations ────────────────────────────────────────────────────

const TITLE_OPTIONS = ["mr", "mrs", "junior", "minior"] as const;

function IncomingRegistrations({ clubName }: { clubName: string }) {
    const { t, lang } = useLanguage();
    const allComps = loadCompetitions();
    const myComps  = allComps.filter((c) => isOrganizerOf(c.organizer, clubName));

    const [allRegs, setAllRegs] = useState<RegEntry[]>([]);
    const [regsLoading, setRegsLoading] = useState(true);
    const [editIdx,       setEditIdx]       = useState<number | null>(null);
    const [editForm,      setEditForm]      = useState<RegEntry | null>(null);
    const [pairingCompId, setPairingCompId] = useState<string | null>(null);
    const [pairingType,   setPairingType]   = useState<PairCat>("mix-d");
    const [pairSlots,     setPairSlots]     = useState<string[]>(["", ""]);

    const [refreshing, setRefreshing] = useState(false);

    function fetchRegs(initial = false) {
        if (initial) setRegsLoading(true); else setRefreshing(true);
        supabase.from('registrations').select('*').order('created_at').then(({ data }) => {
            setAllRegs((data ?? []).map(rowToRegEntry));
            setRegsLoading(false);
            setRefreshing(false);
        });
    }

    useEffect(() => { fetchRegs(true); }, []);

    async function persistRegs(next: RegEntry[]) {
        const prevIds = new Set(allRegs.map((r) => r.id).filter(Boolean));
        const toInsert = next.filter((r) => !r.id);
        const toDelete = allRegs.filter((r) => r.id && !next.find((n) => n.id === r.id));
        const toUpdate = next.filter((r) => r.id && prevIds.has(r.id));

        await Promise.all([
            ...toInsert.map((r) => supabase.from('registrations').insert(regEntryToRow(r))),
            ...toDelete.map((r) => supabase.from('registrations').delete().eq('id', r.id!)),
            ...toUpdate.map((r) => supabase.from('registrations').update(regEntryToRow(r)).eq('id', r.id!)),
        ]);

        const { data } = await supabase.from('registrations').select('*').order('created_at');
        setAllRegs((data ?? []).map(rowToRegEntry));
    }

    function startEdit(globalIdx: number) {
        setEditIdx(globalIdx);
        setEditForm({ ...allRegs[globalIdx] });
    }

    function cancelEdit() { setEditIdx(null); setEditForm(null); }

    async function saveEdit() {
        if (editIdx === null || !editForm) return;
        await persistRegs(allRegs.map((r, i) => i === editIdx ? editForm : r));
        setEditIdx(null);
        setEditForm(null);
    }

    async function deleteReg(globalIdx: number) {
        if (!window.confirm(lang === "sv" ? "Ta bort anmälan?" : "Remove registration?")) return;
        await persistRegs(allRegs.filter((_, i) => i !== globalIdx));
    }

    function setField<K extends keyof RegEntry>(key: K, val: RegEntry[K]) {
        setEditForm((f) => f ? { ...f, [key]: val } : f);
    }

    async function addPairFromSlots(compId: string) {
        const pairInfo = PAIR_TYPES.find((pt) => pt.id === pairingType);
        if (!pairInfo) return;
        const indices = pairSlots.map((s) => parseInt(s));
        if (indices.some(isNaN) || new Set(indices).size !== indices.length) return;
        const ps = indices.map((i) => allRegs[i]);
        if (ps.some((p) => !p)) return;
        const ts    = new Date().toISOString();
        const names = ps.map((p) => `${p.firstName} ${p.lastName}`.trim());
        if (pairingType === "team-g") {
            const teamId = `team-${Date.now()}`;
            persistRegs([...allRegs, ...ps.map((p, i) => ({
                firstName: p.firstName, lastName: p.lastName, club: p.club,
                category: "team-g" as const, title: p.title,
                pairWith: names.filter((_, j) => j !== i).join(", "),
                teamId, createdAt: ts + (i > 0 ? `-${i}` : ""), competitionId: compId,
            }))]);
        } else {
            const [p1, p2] = ps;
            const [n1, n2] = names;
            persistRegs([...allRegs,
                { firstName: p1.firstName, lastName: p1.lastName, club: p1.club, category: pairingType, title: p1.title, pairWith: n2, createdAt: ts,        competitionId: compId },
                { firstName: p2.firstName, lastName: p2.lastName, club: p2.club, category: pairingType, title: p2.title, pairWith: n1, createdAt: ts + "-2", competitionId: compId },
            ]);
        }
        setPairSlots(Array(pairInfo.size).fill(""));
    }

    async function deletePairGroup(cat: string, key: string, compId: string) {
        if (cat === "team-g") {
            persistRegs(allRegs.filter((r) => !(r.competitionId === compId && r.category === "team-g" && r.teamId === key)));
        } else {
            persistRegs(allRegs.filter((r) => {
                if (r.competitionId !== compId || r.category !== cat) return true;
                const rName = `${r.firstName} ${r.lastName}`.trim();
                return [rName, r.pairWith ?? ""].sort().join("|") !== key;
            }));
        }
    }

    if (regsLoading) return <p className="club-empty">…</p>;
    if (myComps.length === 0) {
        return <p className="club-empty">{t.club_incoming_none_comp}</p>;
    }

    return (
        <div className="club-incoming-section">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                <button
                    type="button"
                    className="secondary-action"
                    style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                    disabled={refreshing}
                    onClick={() => fetchRegs(false)}
                >
                    {refreshing ? "…" : (lang === "sv" ? "Uppdatera" : "Refresh")}
                </button>
            </div>
            {myComps.map((comp) => {
                // Keep global indices so edits/deletes target the right entry
                const compRegs = allRegs
                    .map((r, i) => ({ r, i }))
                    .filter(({ r }) => r.competitionId === comp.id);

                const byClub = new Map<string, { r: RegEntry; i: number }[]>();
                for (const entry of compRegs) {
                    const key = entry.r.club || "—";
                    if (!byClub.has(key)) byClub.set(key, []);
                    byClub.get(key)!.push(entry);
                }
                const clubGroups = [...byClub.entries()].sort(([a], [b]) => a.localeCompare(b, "sv"));

                return (
                    <div key={comp.id} className="club-incoming-comp">
                        <div className="club-incoming-comp-header">
                            <div>
                                <strong>{comp.name}</strong>
                                <span>{comp.date}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button type="button" className="secondary-action score-button"
                                    style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                                    onClick={() => {
                                        setPairingCompId(pairingCompId === comp.id ? null : comp.id);
                                        setPairSlots(Array(PAIR_TYPES.find((pt) => pt.id === pairingType)?.size ?? 2).fill(""));
                                    }}>
                                    {pairingCompId === comp.id
                                        ? (lang === "sv" ? "Stäng" : "Close")
                                        : (lang === "sv" ? "Skapa par" : "Create pairs")}
                                </button>
                                <span className="club-tab-count">{compRegs.filter(({ r }) => !PAIR_CATS.includes(r.category)).length} {t.club_incoming_count}</span>
                            </div>
                        </div>
                        {(() => {
                            if (compRegs.length === 0) return <p className="club-empty">{t.club_incoming_empty}</p>;

                            // ── Kategorisera ──────────────────────────────
                            const lagEntries     = compRegs.filter(({ r }) => r.category === "lag" || r.category === "team-g");
                            const mixEntries     = compRegs.filter(({ r }) => r.category === "mix-d");
                            const dubbelEntries  = compRegs.filter(({ r }) => r.category === "dubbel");
                            const indivEntries   = compRegs.filter(({ r }) => !["lag","team-g","mix-d","dubbel"].includes(r.category));

                            // Lag: group by teamId/name
                            const lagGroups: { key: string; label: string; members: { r: RegEntry; i: number }[] }[] = [];
                            const seenLag = new Set<string>();
                            for (const entry of lagEntries) {
                                const key = entry.r.teamId ?? `${entry.r.firstName}-${entry.r.lastName}`;
                                if (!seenLag.has(key)) {
                                    seenLag.add(key);
                                    const members = lagEntries.filter(({ r }) => (r.teamId ?? "") === (entry.r.teamId ?? ""));
                                    lagGroups.push({ key, label: entry.r.teamId ?? (lang === "sv" ? "Lag" : "Team"), members });
                                }
                            }

                            // Pairs: dedupe by sorted name pair
                            function buildPairs(entries: { r: RegEntry; i: number }[]) {
                                const seen = new Set<string>();
                                const pairs: { name1: string; name2: string; club1: string; club2: string; key: string }[] = [];
                                for (const { r } of entries) {
                                    const n1 = `${r.firstName} ${r.lastName}`.trim();
                                    const n2 = r.pairWith ?? "?";
                                    const k = [n1, n2].sort().join("|");
                                    if (!seen.has(k)) { seen.add(k); pairs.push({ name1: n1, name2: n2, club1: r.club, club2: "", key: k }); }
                                }
                                return pairs;
                            }
                            const mixPairGroups    = buildPairs(mixEntries);
                            const dubbelPairGroups = buildPairs(dubbelEntries);

                            // Individuell: group by class
                            const byClass = new Map<string, { r: RegEntry; i: number }[]>();
                            for (const entry of indivEntries) {
                                const k = entry.r.category;
                                if (!byClass.has(k)) byClass.set(k, []);
                                byClass.get(k)!.push(entry);
                            }
                            const classGroups = [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b));

                            const catHeader = (label: string, count: number) => (
                                <div className="mix-incoming-title" style={{ marginTop: "1rem" }}>
                                    {label}
                                    <span className="club-tab-count">{count}</span>
                                </div>
                            );

                            const pairRow = (name1: string, name2: string, key: string, cat: string) => (
                                <div key={key} className="mix-incoming-pair-row">
                                    <span>{name1}</span>
                                    <span className="mix-pair-sep">+</span>
                                    <span>{name2}</span>
                                    <button type="button" className="reg-action-btn reg-action-delete"
                                        style={{ marginLeft: "auto" }}
                                        title={lang === "sv" ? "Ta bort par" : "Remove pair"}
                                        onClick={() => deletePairGroup(cat, key, comp.id)}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            );

                            return (
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    {/* ── Lag ── */}
                                    {lagGroups.length > 0 && (
                                        <>
                                            {catHeader(lang === "sv" ? "Lag" : "Teams", lagGroups.length)}
                                            {lagGroups.map(({ key, label, members }) => (
                                                <div key={key} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.75rem", marginBottom: "0.5rem" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                                                        <strong>{label}</strong>
                                                        <button type="button" className="reg-action-btn reg-action-delete"
                                                            title={lang === "sv" ? "Ta bort lag" : "Remove team"}
                                                            onClick={() => {
                                                                const cat = members[0]?.r.category === "team-g" ? "team-g" : "lag";
                                                                if (cat === "team-g") deletePairGroup("team-g", key, comp.id);
                                                                else persistRegs(allRegs.filter((r) => !(r.competitionId === comp.id && r.category === "lag" && r.teamId === key)));
                                                            }}>
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                                        {members.map(({ r, i: gi }) => (
                                                            <li key={gi} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                                                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)", flexShrink: 0 }} />
                                                                <span>{r.firstName} {r.lastName}</span>
                                                                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{r.club}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* ── Mix Dubbel ── */}
                                    {mixPairGroups.length > 0 && (
                                        <>
                                            {catHeader("Mix Dubbel", mixPairGroups.length)}
                                            {mixPairGroups.map(({ name1, name2, key }) => pairRow(name1, name2, key, "mix-d"))}
                                        </>
                                    )}

                                    {/* ── Dubbel ── */}
                                    {dubbelPairGroups.length > 0 && (
                                        <>
                                            {catHeader("Dubbel", dubbelPairGroups.length)}
                                            {dubbelPairGroups.map(({ name1, name2, key }) => pairRow(name1, name2, key, "dubbel"))}
                                        </>
                                    )}

                                    {/* ── Individuell ── */}
                                    {indivEntries.length > 0 && (
                                        <>
                                            {catHeader(lang === "sv" ? "Individuell" : "Individual", indivEntries.length)}
                                            {classGroups.map(([cls, entries]) => (
                                                <div key={cls} style={{ marginBottom: "0.75rem" }}>
                                                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.25rem" }}>
                                                        {t.sc_class_prefix} {cls}
                                                    </div>
                                                    <ul className="club-incoming-player-list">
                                                        {entries.map(({ r, i: gi }) => (
                                                            <li key={gi}>
                                                                {editIdx === gi && editForm ? (
                                                                    <div className="reg-edit-form">
                                                                        <div className="reg-edit-row">
                                                                            <input type="text" value={editForm.firstName}
                                                                                onChange={(e) => setField("firstName", e.target.value)}
                                                                                placeholder={t.reg_first_name} />
                                                                            <input type="text" value={editForm.lastName}
                                                                                onChange={(e) => setField("lastName", e.target.value)}
                                                                                placeholder={t.reg_last_name} />
                                                                            <input type="text" value={editForm.club}
                                                                                onChange={(e) => setField("club", e.target.value)}
                                                                                placeholder={t.reg_club} />
                                                                            <select value={editForm.category}
                                                                                onChange={(e) => setField("category", e.target.value)}>
                                                                                {["1","2","3","4"].map((c) => (
                                                                                    <option key={c} value={c}>{t.sc_class_prefix} {c}</option>
                                                                                ))}
                                                                            </select>
                                                                            <select value={editForm.title}
                                                                                onChange={(e) => setField("title", e.target.value)}>
                                                                                <option value="">—</option>
                                                                                {TITLE_OPTIONS.map((v) => (
                                                                                    <option key={v} value={v}>{v}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div className="reg-edit-actions">
                                                                            <button className="primary-action score-button" type="button" onClick={saveEdit}>
                                                                                <Save size={14} /> {lang === "sv" ? "Spara" : "Save"}
                                                                            </button>
                                                                            <button className="secondary-action score-button" type="button" onClick={cancelEdit}>
                                                                                {lang === "sv" ? "Avbryt" : "Cancel"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="club-incoming-player-name">{r.firstName} {r.lastName}</span>
                                                                        <span className="club-incoming-player-meta">{r.club}{r.title ? ` · ${r.title}` : ""}</span>
                                                                        <div className="reg-row-actions">
                                                                            <button type="button" className="reg-action-btn"
                                                                                title={lang === "sv" ? "Ändra" : "Edit"}
                                                                                onClick={() => startEdit(gi)}>
                                                                                <Pencil size={13} />
                                                                            </button>
                                                                            <button type="button" className="reg-action-btn reg-action-delete"
                                                                                title={lang === "sv" ? "Ta bort" : "Delete"}
                                                                                onClick={() => deleteReg(gi)}>
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                </div>
            );
        })}
    </div>
);
}

// ── Helpers: convert RegEntry → PlayerScore ───────────────────────────────────

function titleToAgeCategory(title: string): AgeCategory {
    if (title === "mrs")    return "dam";
    if (title === "junior") return "junior";
    if (title === "minior") return "minior";
    return "herr";
}

function regToPlayerScore(r: RegEntry, idx: number): PlayerScore {
    return {
        id:          `reg-${idx}-${r.firstName}-${r.lastName}`,
        name:        `${r.firstName} ${r.lastName}`.trim(),
        club:        r.club,
        classLevel:  (Number(r.category) || 4) as ClassLevel,
        ageCategory: titleToAgeCategory(r.title),
        rounds:      Array(10).fill(0),
        sevenMeters: 0,
    };
}

// ── Result display helpers ────────────────────────────────────────────────────

function OwnRankTable({ players, showClass = false }: { players: PlayerScore[]; showClass?: boolean }) {
    const { t } = useLanguage();
    const rankings = rankPlayers(players);
    if (rankings.length === 0) return <p className="results-empty-cat">{t.results_empty_heading}</p>;
    return (
        <div className="results-class-table">
            <table>
                <thead>
                    <tr>
                        <th>#</th><th>{t.results_col_player}</th><th>{t.results_col_club}</th>
                        {showClass && <th>{t.results_class_prefix}</th>}
                        <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
                        <th className="results-subtotal">1–5</th>
                        <th>6</th><th>7</th><th>8</th><th>9</th><th>10</th>
                        <th className="results-subtotal">6–10</th>
                        <th className="results-subtotal">{t.results_col_total}</th>
                        <th className="results-subtotal">GP</th>
                    </tr>
                </thead>
                <tbody>
                    {rankings.map((p) => (
                        <tr key={p.id} className={p.rank <= 3 ? "top-rank" : undefined}>
                            <td className="rank-cell">{p.rank}</td>
                            <td>{p.name}</td>
                            <td>{p.club || "–"}</td>
                            {showClass && <td>{p.classLevel}</td>}
                            {p.rounds.slice(0, 5).map((r, i) => <td key={i}>{r || ""}</td>)}
                            <td className="results-subtotal">{p.firstHalf}</td>
                            {p.rounds.slice(5, 10).map((r, i) => <td key={i}>{r || ""}</td>)}
                            <td className="results-subtotal">{p.secondHalf}</td>
                            <td className="results-subtotal"><strong>{p.total}</strong></td>
                            <td className="results-subtotal">{p.rankingPoints}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function OwnClassBox({ classLevel, players, handle }: { classLevel: ClassLevel; players: PlayerScore[]; handle: React.ReactNode }) {
    const { t } = useLanguage();
    return (
        <section className="results-class-box">
            <div className="results-class-header">
                {handle}
                <h2>{t.results_class_prefix} {classLevel}</h2>
            </div>
            <OwnRankTable players={players} />
        </section>
    );
}

function OwnCategoryBox({ title, players, showClass, handle }: { title: string; players: PlayerScore[]; showClass?: boolean; handle: React.ReactNode }) {
    return (
        <section className="results-class-box">
            <div className="results-class-header">
                {handle}
                <h2>{title}</h2>
            </div>
            <OwnRankTable players={players} showClass={showClass} />
        </section>
    );
}

function OwnTeamBox({ players, assignments, handle }: { players: PlayerScore[]; assignments: { id: string; name: string; playerIds: string[] }[]; handle: React.ReactNode }) {
    const { t } = useLanguage();
    const teams = rankTeams(players, assignments);
    if (teams.length === 0) return null;
    return (
        <section className="results-class-box results-team-box">
            <div className="results-class-header">
                {handle}
                <h2>{t.results_team_heading}</h2>
            </div>
            <div className="results-class-table">
                <table>
                    <thead>
                        <tr>
                            <th>#</th><th>{t.results_col_teams_name}</th>
                            <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
                            <th className="results-subtotal">1–5</th>
                            <th>6</th><th>7</th><th>8</th><th>9</th><th>10</th>
                            <th className="results-subtotal">6–10</th>
                            <th className="results-subtotal">{t.results_col_total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team) => {
                            const rounds = Array.from({ length: 10 }, (_, i) =>
                                team.players.reduce((s, p) => s + (p.rounds[i] ?? 0), 0)
                            );
                            const firstHalf  = rounds.slice(0, 5).reduce((a, b) => a + b, 0);
                            const secondHalf = rounds.slice(5, 10).reduce((a, b) => a + b, 0);
                            return (
                                <tr key={team.id} className={team.rank <= 3 ? "top-rank" : undefined}>
                                    <td className="rank-cell">{team.rank}</td>
                                    <td><strong>{team.name}</strong></td>
                                    {rounds.slice(0, 5).map((r, i) => <td key={i}>{r || ""}</td>)}
                                    <td className="results-subtotal">{firstHalf || ""}</td>
                                    {rounds.slice(5, 10).map((r, i) => <td key={i}>{r || ""}</td>)}
                                    <td className="results-subtotal">{secondHalf || ""}</td>
                                    <td className="results-subtotal"><strong>{team.total}</strong></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

// ── Shared scoring constants (mirror ScoringPage) ────────────────────────────

const SCORE_PREFIX  = "hsc-scores-v3";
const LIVE_PREFIX   = "hsc-live-v1";
const TEAMS_PREFIX  = "hsc-teams-v1";
const LANES_PREFIX  = "hsc-lanes-v1";
const ACTIVE_KEY    = "hsc-active-v1";
const FLOW_PREFIX   = "hsc-flow-v1";
const TYPE_SEP      = "+";

import { contestTypeDefs, typeName } from "../lib/contestTypes";

function buildTypeId(ids: string[]) { return ids.join(TYPE_SEP); }
function parseTypeId(raw: string)   { return raw.split(TYPE_SEP).filter(Boolean); }

type OwnView = "pick" | "type" | "registration" | "lanes" | "teams" | "scoring";

// ── Club settings (password change) ──────────────────────────────────────────

function ClubSettings({ clubName }: { clubName: string }) {
    const { t, lang } = useLanguage();
    const [current,  setCurrent]  = useState("");
    const [next1,    setNext1]    = useState("");
    const [next2,    setNext2]    = useState("");
    const [status,   setStatus]   = useState<"idle" | "ok" | "wrongCurrent" | "mismatch">("idle");

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (next1 !== next2) { setStatus("mismatch"); return; }
        if (!next1.trim()) return;
        const ok = await checkClubPassword(clubName, current);
        if (!ok) { setStatus("wrongCurrent"); return; }
        await setClubPassword(clubName, next1);
        setCurrent(""); setNext1(""); setNext2("");
        setStatus("ok");
    }

    const msg =
        status === "ok"          ? (lang === "sv" ? "Lösenordet uppdaterat!" : "Password updated!") :
        status === "wrongCurrent"? (lang === "sv" ? "Nuvarande lösenord stämmer inte." : "Current password is wrong.") :
        status === "mismatch"    ? (lang === "sv" ? "Nya lösenorden matchar inte." : "New passwords do not match.") : "";

    return (
        <div className="club-comp-section">
            <div className="club-section-header">
                <div>
                    <p className="eyebrow">{t.club_settings_eyebrow}</p>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>{t.club_settings_desc}</p>
                </div>
            </div>
            <section className="admin-panel" style={{ maxWidth: 420 }}>
                <div className="panel-title-row"><h2>{t.club_settings_pw_heading}</h2></div>
                <form className="club-login-form" onSubmit={handleSave}>
                    <label>
                        {t.club_settings_pw_current}
                        <div className="club-login-field">
                            <Lock size={16} aria-hidden="true" />
                            <input type="password" required value={current} placeholder="••••••••"
                                onChange={(e) => { setCurrent(e.target.value); setStatus("idle"); }} />
                        </div>
                    </label>
                    <label>
                        {t.club_settings_pw_new}
                        <div className="club-login-field">
                            <Lock size={16} aria-hidden="true" />
                            <input type="password" required value={next1} placeholder="••••••••"
                                onChange={(e) => { setNext1(e.target.value); setStatus("idle"); }} />
                        </div>
                    </label>
                    <label>
                        {t.club_settings_pw_confirm}
                        <div className="club-login-field">
                            <Lock size={16} aria-hidden="true" />
                            <input type="password" required value={next2} placeholder="••••••••"
                                onChange={(e) => { setNext2(e.target.value); setStatus("idle"); }} />
                        </div>
                    </label>
                    {msg && (
                        <p className={status === "ok" ? "form-message" : "club-login-error"}>{msg}</p>
                    )}
                    <button className="primary-action club-login-btn" type="submit"
                        disabled={!current || !next1 || !next2}>
                        <Save size={16} aria-hidden="true" />
                        {t.club_settings_pw_save}
                    </button>
                </form>
            </section>
        </div>
    );
}

// ── Club own competition (full setup flow) ────────────────────────────────────

function OwnCompetition({ clubName }: { clubName: string }) {
    const { t, lang } = useLanguage();

    const myComps = loadCompetitions().filter((c) => isOrganizerOf(c.organizer, clubName));

    const [allRegs, setAllRegs] = useState<RegEntry[]>([]);

    useEffect(() => {
        supabase.from('registrations').select('*').order('created_at').then(({ data }) => {
            setAllRegs((data ?? []).map(rowToRegEntry));
        });
    }, []);

    const [view,               setView]               = useState<OwnView>("pick");
    const [selectedCompId,     setSelectedCompId]     = useState<string | null>(null);
    const [typeIds,            setTypeIds]            = useState<string[]>([]);
    const [laneCount,          setLaneCount]          = useState(1);
    const [selectedPlayerIds,  setSelectedPlayerIds]  = useState<string[]>([]);
    const [players,            setPlayers]            = useState<PlayerScore[]>([]);
    const [laneAssignments,    setLaneAssignments]    = useState<Record<string, number>>({});
    const [activeLane,         setActiveLane]         = useState<number | null>(null);
    const [teamAssignments,    setTeamAssignments]    = useState<{ id: string; name: string; playerIds: string[] }[]>([]);
    const [activeTeamId,       setActiveTeamId]       = useState<string | null>(null);
    const [status,             setStatus]             = useState<"idle" | "saved" | "reset">("idle");
    const [laneScoreFilter,    setLaneScoreFilter]    = useState<number | "all">("all");
    const [classFilter,        setClassFilter]        = useState<ClassLevel | "all">("all");
    const [photoStep,          setPhotoStep]          = useState<"closed" | "upload" | "analyzing" | "review">("closed");
    const [photoApiKey,        setPhotoApiKey]        = useState(() => localStorage.getItem("hsc-anthropic-key") ?? "");
    const [photoHalf,          setPhotoHalf]          = useState<"first" | "second">("first");
    const [photoMatches,       setPhotoMatches]       = useState<(RecognizedScore & { matchedId: string | null })[]>([]);
    const [photoError,         setPhotoError]         = useState("");
    const [csvStep,            setCsvStep]            = useState<"closed" | "review">("closed");
    const [csvMatches,         setCsvMatches]         = useState<{ csvName: string; round: number; score: number; matchedId: string | null }[]>([]);
    const [csvError,           setCsvError]           = useState("");
    const [addPlayerOpen,      setAddPlayerOpen]      = useState(false);
    const [addPlayerSearch,    setAddPlayerSearch]    = useState("");
    const [addPlayerLane,      setAddPlayerLane]      = useState<number>(1);
    const [addPlayerTab,       setAddPlayerTab]       = useState<"search" | "new">("search");
    const [newPlayerForm,      setNewPlayerForm]      = useState({ firstName: "", lastName: "", club: "", classLevel: 4 as ClassLevel, ageCategory: "herr" as AgeCategory });
    const [editPlayerId,       setEditPlayerId]       = useState<string | null>(null);
    const [editPlayerForm,     setEditPlayerForm]     = useState({ name: "", club: "", classLevel: 4 as ClassLevel, ageCategory: "herr" as AgeCategory });
    const [juniorMode,   setJuniorMode]   = useState<Record<string, "junior" | "class" | "both">>({});
    const [juniorGender, setJuniorGender] = useState<Record<string, "herr" | "dam">>({});

    const selectedComp = myComps.find((c) => c.id === selectedCompId) ?? null;
    const currentRunId = selectedCompId ? `${selectedCompId}__${buildTypeId(typeIds)}` : "";

    // Auto-save flow state at every step so the user can resume after navigating away
    useEffect(() => {
        if (!selectedCompId || view === "pick") return;
        const flowKey = `${FLOW_PREFIX}-${selectedCompId}`;
        const state = { view, typeIds, laneCount, selectedPlayerIds, laneAssignments, teamAssignments };
        localStorage.setItem(flowKey, JSON.stringify(state));
    }, [view, selectedCompId, typeIds, laneCount, selectedPlayerIds, laneAssignments, teamAssignments]);

    // Pool: all players registered for the selected competition
    const compPlayers: PlayerScore[] = selectedCompId
        ? allRegs.filter((r) => r.competitionId === selectedCompId && !PAIR_CATS.includes(r.category)).map(regToPlayerScore)
        : [];

    // Clubs present in the pool
    const compClubs = [...new Set(compPlayers.map((p) => p.club || "—"))].sort((a, b) => a.localeCompare(b, "sv"));

    function goBack() {
        if (view === "type")              setView("pick");
        else if (view === "registration") setView("type");
        else if (view === "lanes")        setView("registration");
        else if (view === "teams")        setView("registration");
        else if (view === "scoring")      setView("pick");
    }

    function pickComp(id: string) {
        localStorage.removeItem(`${FLOW_PREFIX}-${id}`);
        setSelectedCompId(id);
        setTypeIds([]); setLaneCount(1); setSelectedPlayerIds([]);
        setPlayers([]); setLaneAssignments({}); setActiveLane(null);
        setTeamAssignments([]); setActiveTeamId(null); setStatus("idle");
        setView("type");
    }

    function resumeContest(compId: string) {
        // Try to restore from flow state (any step)
        const flowRaw = localStorage.getItem(`${FLOW_PREFIX}-${compId}`);
        const flow: { view: OwnView; typeIds: string[]; laneCount: number; selectedPlayerIds: string[]; laneAssignments: Record<string, number>; teamAssignments: { id: string; name: string; playerIds: string[] }[] } | null = (() => {
            try { return flowRaw ? JSON.parse(flowRaw) : null; } catch { return null; }
        })();

        // Try to restore saved players from scoring session
        const runKey = Object.keys(localStorage).find((k) => k.startsWith(`${SCORE_PREFIX}-${compId}__`));
        const savedPlayers: PlayerScore[] = (() => {
            try { return runKey ? JSON.parse(localStorage.getItem(runKey) ?? "[]") : []; } catch { return []; }
        })();

        const restoredTypeIds = flow?.typeIds ?? (runKey ? parseTypeId(runKey.slice(`${SCORE_PREFIX}-`.length).split("__").slice(1).join("__")) : []);
        const runId = runKey ? runKey.slice(`${SCORE_PREFIX}-`.length) : `${compId}__${buildTypeId(restoredTypeIds)}`;

        const laneData: { count: number; assignments: Record<string, number> } | null = (() => {
            try { return JSON.parse(localStorage.getItem(`${LANES_PREFIX}-${runId}`) ?? "null"); } catch { return null; }
        })();
        const teamData: { id: string; name: string; playerIds: string[] }[] = (() => {
            try { return JSON.parse(localStorage.getItem(`${TEAMS_PREFIX}-${runId}`) ?? "[]"); } catch { return []; }
        })();

        setSelectedCompId(compId);
        setTypeIds(restoredTypeIds);
        setPlayers(savedPlayers);
        setLaneCount(flow?.laneCount ?? laneData?.count ?? 1);
        setLaneAssignments(flow?.laneAssignments ?? laneData?.assignments ?? {});
        setTeamAssignments(flow?.teamAssignments ?? teamData);
        setSelectedPlayerIds(flow?.selectedPlayerIds ?? savedPlayers.map((p) => p.id));
        setActiveLane(null); setActiveTeamId(null); setStatus("idle");
        setView(flow?.view ?? "scoring");
    }

    function bestPhotoMatch(name: string): string | null {
        const lower = name.toLowerCase().trim();
        let m = players.find((p) => p.name.toLowerCase() === lower);
        if (m) return m.id;
        m = players.find((p) => {
            const pl = p.name.toLowerCase();
            return pl.includes(lower) || lower.includes(pl);
        });
        return m?.id ?? null;
    }

    async function handlePhotoFile(file: File) {
        setPhotoStep("analyzing");
        setPhotoError("");
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const recognized = await extractScoresFromImage(dataUrl, photoApiKey);
            setPhotoMatches(recognized.map((r) => ({ ...r, matchedId: bestPhotoMatch(r.name) })));
            setPhotoStep("review");
        } catch (e: unknown) {
            setPhotoError(e instanceof Error ? e.message : String(e));
            setPhotoStep("upload");
        }
    }

    function applyPhotoScores() {
        const offset = photoHalf === "first" ? 0 : 5;
        setPlayers((cur) =>
            cur.map((p) => {
                const match = photoMatches.find((m) => m.matchedId === p.id);
                if (!match) return p;
                const next = [...p.rounds];
                match.rounds.forEach((score, i) => { next[offset + i] = score; });
                return { ...p, rounds: next };
            })
        );
        setPhotoStep("closed");
        setStatus("idle");
    }

    function handleCsvFile(file: File) {
        setCsvError("");
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = reader.result as string;
                const lines = text.trim().split(/\r?\n/);
                const header = lines[0].split(",").map((h) => h.trim());
                const iOmgang = header.findIndex((h) => h === "Omgång" || h === "Omgang");
                const iNamn   = header.findIndex((h) => h === "Namn");
                const iSumma  = header.findIndex((h) => h === "Summa");
                if (iOmgang === -1 || iNamn === -1 || iSumma === -1) {
                    setCsvError("Kunde inte hitta kolumnerna Omgång, Namn och Summa i filen.");
                    return;
                }
                const matches = lines.slice(1).flatMap((line) => {
                    const cols = line.split(",");
                    const round = parseInt(cols[iOmgang] ?? "", 10);
                    const name  = cols[iNamn]?.trim() ?? "";
                    const score = parseInt(cols[iSumma] ?? "", 10);
                    if (!name || isNaN(round) || isNaN(score)) return [];
                    return [{ csvName: name, round, score, matchedId: bestPhotoMatch(name) }];
                });
                if (matches.length === 0) { setCsvError("Inga giltiga rader hittades."); return; }
                setCsvMatches(matches);
                setCsvStep("review");
            } catch {
                setCsvError("Kunde inte läsa filen.");
            }
        };
        reader.readAsText(file, "utf-8");
    }

    function applyCsvScores() {
        setPlayers((cur) =>
            cur.map((p) => {
                const relevant = csvMatches.filter((m) => m.matchedId === p.id);
                if (relevant.length === 0) return p;
                const next = [...p.rounds];
                relevant.forEach((m) => { next[m.round - 1] = m.score; });
                return { ...p, rounds: next };
            })
        );
        setCsvStep("closed");
        setCsvMatches([]);
        setStatus("idle");
    }

    function proceedFromType() {
        if (typeIds.length === 0) return;
        setSelectedPlayerIds(compPlayers.map((p) => p.id));  // pre-select all
        setView("registration");
    }

    function startContest() {
        const chosen: PlayerScore[] = [];
        for (const p of compPlayers.filter((p) => selectedPlayerIds.includes(p.id))) {
            const base = { ...p, rounds: Array(10).fill(0) as number[], sevenMeters: 0 };
            if (p.ageCategory === "junior") {
                const mode = juniorMode[p.id] ?? "junior";
                const gender = juniorGender[p.id] ?? "herr";
                if (mode === "junior") {
                    chosen.push(base);
                } else if (mode === "class") {
                    chosen.push({ ...base, ageCategory: gender });
                } else {
                    chosen.push({ ...base, ageCategory: "junior" });
                    chosen.push({ ...base, id: p.id + "-k", ageCategory: gender });
                }
            } else {
                chosen.push(base);
            }
        }
        const runId = `${selectedCompId}__${buildTypeId(typeIds)}`;
        localStorage.setItem(ACTIVE_KEY, JSON.stringify({ runId, contestName: selectedComp?.name, typeName: typeName(typeIds, lang) }));
        localStorage.setItem(`${LIVE_PREFIX}-${runId}`, JSON.stringify(chosen));
        setPlayers(chosen); setTeamAssignments([]); setActiveTeamId(null);
        setLaneAssignments({}); setActiveLane(null); setStatus("idle");
        if (laneCount > 1) setView("lanes");
        else if (typeIds.includes("team")) setView("teams");
        else setView("scoring");
    }

    function saveLanes(count: number, assignments: Record<string, number>) {
        localStorage.setItem(`${LANES_PREFIX}-${currentRunId}`, JSON.stringify({ count, assignments }));
    }

    function toggleLanePlayer(id: string) {
        if (!activeLane) return;
        setLaneAssignments((prev) => {
            const next = { ...prev };
            if (next[id] === activeLane) delete next[id]; else next[id] = activeLane;
            saveLanes(laneCount, next);
            return next;
        });
    }

    function proceedFromLanes() {
        saveLanes(laneCount, laneAssignments); setActiveLane(null);
        if (typeIds.includes("team")) setView("teams"); else setView("scoring");
    }

    function saveTeams(assignments: typeof teamAssignments) {
        const complete = assignments.filter((t) => t.playerIds.length === 4);
        if (complete.length > 0) localStorage.setItem(`${TEAMS_PREFIX}-${currentRunId}`, JSON.stringify(complete));
        else localStorage.removeItem(`${TEAMS_PREFIX}-${currentRunId}`);
    }

    function addTeam() {
        const n = teamAssignments.length + 1;
        const id = `team-${Date.now()}`;
        const next = [...teamAssignments, { id, name: `${lang === "sv" ? "Lag" : "Team"} ${n}`, playerIds: [] }];
        setTeamAssignments(next); setActiveTeamId(id);
    }

    function updateTeamName(teamId: string, name: string) {
        setTeamAssignments((cur) => cur.map((tm) => tm.id === teamId ? { ...tm, name } : tm));
    }

    function togglePlayerInTeam(playerId: string) {
        if (!activeTeamId) return;
        setTeamAssignments((cur) => {
            const next = cur.map((team) => {
                if (team.id !== activeTeamId) return team;
                if (team.playerIds.includes(playerId)) return { ...team, playerIds: team.playerIds.filter((id) => id !== playerId) };
                if (team.playerIds.length >= 4) return team;
                let { name } = team;
                const newIds = [...team.playerIds, playerId];
                if (newIds.length === 1) {
                    const idx = cur.findIndex((t) => t.id === team.id);
                    const def = `${lang === "sv" ? "Lag" : "Team"} ${idx + 1}`;
                    if (name === def) {
                        const club = players.find((p) => p.id === playerId)?.club ?? "—";
                        const sib  = cur.filter((t) => t.id !== team.id && t.playerIds.length > 0 && (players.find((p) => p.id === t.playerIds[0])?.club ?? "—") === club).length;
                        name = sib === 0 ? club : `${club} ${sib + 1}`;
                    }
                }
                return { ...team, name, playerIds: newIds };
            });
            saveTeams(next);
            return next;
        });
    }

    function removeTeam(teamId: string) {
        const next = teamAssignments.filter((t) => t.id !== teamId);
        setTeamAssignments(next);
        if (activeTeamId === teamId) setActiveTeamId(next[next.length - 1]?.id ?? null);
        saveTeams(next);
    }

    function updateRound(id: string, idx: number, val: string) {
        const score = Math.max(0, Math.min(100, Number(val) || 0));
        setPlayers((cur) => {
            const next = cur.map((p) => p.id === id ? { ...p, rounds: p.rounds.map((r, i) => i === idx ? score : r) } : p);
            localStorage.setItem(`${LIVE_PREFIX}-${currentRunId}`, JSON.stringify(next));
            return next;
        });
        setStatus("idle");
    }

    function saveFlow() {
        if (!selectedCompId || view === "pick") return;
        const state = { view, typeIds, laneCount, selectedPlayerIds, laneAssignments, teamAssignments };
        localStorage.setItem(`${FLOW_PREFIX}-${selectedCompId}`, JSON.stringify(state));
        setStatus("saved");
    }

    function saveScores() {
        localStorage.setItem(`${SCORE_PREFIX}-${currentRunId}`, JSON.stringify(players));
        localStorage.setItem(`${LIVE_PREFIX}-${currentRunId}`, JSON.stringify(players));
        localStorage.setItem(ACTIVE_KEY, JSON.stringify({ runId: currentRunId, contestName: selectedComp?.name, typeName: typeName(typeIds, lang) }));
        setStatus("saved");
    }

    function resetScores() {
        localStorage.removeItem(`${SCORE_PREFIX}-${currentRunId}`);
        localStorage.removeItem(`${LIVE_PREFIX}-${currentRunId}`);
        localStorage.removeItem(`${TEAMS_PREFIX}-${currentRunId}`);
        localStorage.removeItem(`${LANES_PREFIX}-${currentRunId}`);
        localStorage.removeItem(ACTIVE_KEY);
        setPlayers((cur) => cur.map((p) => ({ ...p, rounds: Array(10).fill(0), sevenMeters: 0 })));
        setStatus("reset");
    }

    const catLabel = (cat: AgeCategory) =>
        cat === "dam" ? t.reg_mrs : cat === "junior" ? t.reg_junior : cat === "minior" ? t.reg_minior : t.reg_mr;

    // ── No own competitions ──
    if (myComps.length === 0) {
        return (
            <div className="club-own-comp-section">
                <p className="club-empty">{t.club_own_none}</p>
            </div>
        );
    }

    // ── PICK COMPETITION ──
    if (view === "pick") {
        return (
            <div className="club-own-comp-section">
                <p className="club-comp-pick-label">{t.club_own_pick_comp}</p>
                <div className="club-comp-grid">
                    {myComps.map((c) => {
                        const d   = new Date(c.date + "T12:00:00");
                        const day = d.getDate();
                        const mon = d.toLocaleString("sv-SE", { month: "short" }).toUpperCase();
                        const year = d.getFullYear();
                        const regCount = allRegs.filter((r) => r.competitionId === c.id && !PAIR_CATS.includes(r.category)).length;
                        const hasSaved = Object.keys(localStorage).some((k) => k.startsWith(`${SCORE_PREFIX}-${c.id}__`)) || localStorage.getItem(`${FLOW_PREFIX}-${c.id}`) !== null;
                        const badge = (
                            <span className="club-comp-date-badge">
                                <span>{mon}</span>
                                <strong>{day}</strong>
                                <span>{year}</span>
                            </span>
                        );
                        const info = (
                            <span className="club-comp-info">
                                <strong>{c.name}</strong>
                                {c.location && <span>{c.location}</span>}
                                <span className="club-tab-count" style={{ marginTop: 4 }}>
                                    {regCount} {t.club_incoming_count}
                                </span>
                            </span>
                        );
                        if (hasSaved) {
                            return (
                                <div key={c.id} className="club-comp-card club-comp-card-resume">
                                    {badge}{info}
                                    <span className="club-comp-resume-actions">
                                        <button type="button" className="primary-action"
                                            onClick={() => resumeContest(c.id)}>
                                            {lang === "sv" ? "Fortsätt" : "Continue"}
                                        </button>
                                        <button type="button" className="secondary-action"
                                            onClick={() => pickComp(c.id)}>
                                            {lang === "sv" ? "Ny tävling" : "New contest"}
                                        </button>
                                    </span>
                                </div>
                            );
                        }
                        return (
                            <button key={c.id} type="button" className="club-comp-card"
                                onClick={() => pickComp(c.id)}>
                                {badge}{info}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── TYPE + LANES ──
    if (view === "type") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{selectedComp?.name}</p>
                        <h1>{t.club_own_setup_type}</h1>
                        <p>{t.sc_type_desc}</p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={goBack}>
                        <ArrowLeft size={17} aria-hidden="true" /> {t.sc_back}
                    </button>
                </div>

                <section className="score-controls contest-registration-actions">
                    <span className="success-pill">{typeIds.length} {t.sc_selected_suffix}</span>
                    <button className="secondary-action score-button" type="button"
                        disabled={typeIds.length === 0} onClick={() => setTypeIds([])}>
                        {t.sc_clear}
                    </button>
                    <button className="secondary-action score-button" type="button" onClick={saveFlow}>
                        <Save size={15} aria-hidden="true" /> {status === "saved" ? (lang === "sv" ? "Sparat!" : "Saved!") : (lang === "sv" ? "Spara" : "Save")}
                    </button>
                    <button className="primary-action score-button" type="button"
                        disabled={typeIds.length === 0} onClick={proceedFromType}>
                        {t.sc_continue}
                    </button>
                </section>

                <div className="lane-count-section">
                    <span className="lane-count-label">{t.sc_lanes_label}</span>
                    <div className="lane-count-picker">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button key={n} type="button"
                                className={laneCount === n ? "lane-count-btn active" : "lane-count-btn"}
                                onClick={() => setLaneCount(n)}>{n}</button>
                        ))}
                    </div>
                </div>

                <section className="contest-grid">
                    {contestTypeDefs.map((type) => (
                        <button key={type.id} type="button"
                            className={typeIds.includes(type.id) ? "contest-card selected" : "contest-card"}
                            aria-pressed={typeIds.includes(type.id)}
                            onClick={() => setTypeIds((cur) => cur.includes(type.id) ? cur.filter((x) => x !== type.id) : [...cur, type.id])}>
                            <span className="contest-card-icon"><Trophy size={20} aria-hidden="true" /></span>
                            <span>{lang === "sv" ? type.sv : type.en}</span>
                        </button>
                    ))}
                </section>
            </div>
        );
    }

    // ── PLAYER REGISTRATION ──
    if (view === "registration") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{selectedComp?.name}</p>
                        <h1>{t.sc_reg_eyebrow}</h1>
                        <p>
                            {lang === "sv"
                                ? `${typeName(typeIds, lang)}. Valda: ${selectedPlayerIds.length}`
                                : `${typeName(typeIds, lang)}. Selected: ${selectedPlayerIds.length}`}
                        </p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={goBack}>
                        <ArrowLeft size={17} aria-hidden="true" /> {t.sc_back}
                    </button>
                </div>

                <section className="score-controls contest-registration-actions">
                    <button className="secondary-action score-button" type="button"
                        onClick={() => setSelectedPlayerIds(compPlayers.map((p) => p.id))}>
                        {t.sc_select_all}
                    </button>
                    <button className="secondary-action score-button" type="button"
                        onClick={() => setSelectedPlayerIds([])}>
                        {t.sc_clear}
                    </button>
                    <button className="secondary-action score-button" type="button" onClick={saveFlow}>
                        <Save size={15} aria-hidden="true" /> {status === "saved" ? (lang === "sv" ? "Sparat!" : "Saved!") : (lang === "sv" ? "Spara" : "Save")}
                    </button>
                    <button className="primary-action score-button" type="button"
                        disabled={selectedPlayerIds.length === 0} onClick={startContest}>
                        {t.sc_start_registered}
                    </button>
                </section>

                {(() => {
                    const pairRegs = allRegs.filter((r) => r.competitionId === selectedCompId && PAIR_CATS.includes(r.category));
                    const hasAny = compPlayers.length > 0 || pairRegs.length > 0;
                    if (!hasAny) return <p className="club-empty">{t.club_own_no_regs}</p>;

                    // All clubs present in either individual or pair/team registrations
                    const allRegClubs = [...new Set([
                        ...compPlayers.map((p) => p.club || "—"),
                        ...pairRegs.map((r) => r.club || "—"),
                    ])].sort((a, b) => a.localeCompare(b, "sv"));

                    const chip = (label: string) => (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "var(--accent, #6366f1)", color: "#fff", opacity: 0.85 }}>
                            {label}
                        </span>
                    );

                    return allRegClubs.map((club) => {
                        const clubIndiv  = compPlayers.filter((p) => (p.club || "—") === club);
                        const clubPairs  = pairRegs.filter((r) => (r.club || "—") === club);

                        // Lag: group by teamId
                        const lagGroups = new Map<string, string[]>();
                        for (const r of clubPairs.filter((r) => r.category === "lag" || r.category === "team-g")) {
                            const key = r.teamId ?? "?";
                            if (!lagGroups.has(key)) lagGroups.set(key, []);
                            lagGroups.get(key)!.push(`${r.firstName} ${r.lastName}`.trim());
                        }

                        // Mix pairs (dedupe)
                        const mixSeen = new Set<string>();
                        const mixPairs: { n1: string; n2: string }[] = [];
                        for (const r of clubPairs.filter((r) => r.category === "mix-d")) {
                            const n1 = `${r.firstName} ${r.lastName}`.trim();
                            const n2 = r.pairWith ?? "?";
                            const k = [n1, n2].sort().join("|");
                            if (!mixSeen.has(k)) { mixSeen.add(k); mixPairs.push({ n1, n2 }); }
                        }

                        // Dubbel pairs (dedupe)
                        const dubSeen = new Set<string>();
                        const dubPairs: { n1: string; n2: string }[] = [];
                        for (const r of clubPairs.filter((r) => r.category === "dubbel")) {
                            const n1 = `${r.firstName} ${r.lastName}`.trim();
                            const n2 = r.pairWith ?? "?";
                            const k = [n1, n2].sort().join("|");
                            if (!dubSeen.has(k)) { dubSeen.add(k); dubPairs.push({ n1, n2 }); }
                        }

                        // Names of lag members — for showing tags on individual cards
                        const lagMemberMap = new Map<string, string>(); // name → teamName
                        for (const [teamName, members] of lagGroups.entries()) {
                            for (const m of members) lagMemberMap.set(m, teamName);
                        }

                        // Mix/dubbel/lag tags for individual player cards
                        function indivTags(name: string) {
                            const tags: string[] = [];
                            const lagTeam = lagMemberMap.get(name);
                            if (lagTeam) tags.push(`Lag · ${lagTeam}`);
                            if (mixPairs.some(({ n1, n2 }) => n1 === name || n2 === name)) tags.push("Mix");
                            if (dubPairs.some(({ n1, n2 }) => n1 === name || n2 === name)) tags.push("Dubbel");
                            return tags;
                        }

                        // All individually-registered players (lag players also compete individually)
                        const pureIndiv = clubIndiv;

                        const subLabel = (text: string) => (
                            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", margin: "0.6rem 0 0.3rem" }}>
                                {text}
                            </div>
                        );

                        return (
                            <section key={club} className="team-club-section">
                                <h3 className="team-club-title">{club}</h3>

                                {/* ── Lag ── */}
                                {lagGroups.size > 0 && (
                                    <>
                                        {subLabel(lang === "sv" ? "Lag" : "Team")}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.25rem" }}>
                                            {[...lagGroups.entries()].map(([teamName, members]) => (
                                                <div key={teamName} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.75rem" }}>
                                                    <strong style={{ fontSize: "0.82rem" }}>{teamName}</strong>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", marginTop: "0.3rem" }}>
                                                        {members.map((m, i) => (
                                                            <div key={i} style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--muted)", flexShrink: 0 }} />
                                                                {m}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* ── Mix ── */}
                                {mixPairs.length > 0 && (
                                    <>
                                        {subLabel("Mix")}
                                        {mixPairs.map(({ n1, n2 }, i) => (
                                            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "0.3rem" }}>
                                                <span style={{ fontSize: "0.85rem" }}>{n1} + {n2}</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* ── Dubbel ── */}
                                {dubPairs.length > 0 && (
                                    <>
                                        {subLabel("Dubbel")}
                                        {dubPairs.map(({ n1, n2 }, i) => (
                                            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 0.75rem", marginBottom: "0.3rem" }}>
                                                <span style={{ fontSize: "0.85rem" }}>{n1} + {n2}</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* ── Individuell ── */}
                                {pureIndiv.length > 0 && (
                                    <>
                                        {subLabel(lang === "sv" ? "Individuell" : "Individual")}
                                        <div className="team-player-grid">
                                            {pureIndiv.map((player) => {
                                                const on = selectedPlayerIds.includes(player.id);
                                                const isJunior = player.ageCategory === "junior";
                                                const mode = juniorMode[player.id] ?? "junior";
                                                const gender = juniorGender[player.id] ?? "herr";
                                                const tags = indivTags(player.name);
                                                return (
                                                    <div key={player.id} className={on ? "team-player-card is-pending" : "team-player-card"}
                                                        style={{ display: "flex", flexDirection: "column", gap: "0.25rem", cursor: "default" }}>
                                                        <button type="button" style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                                                            aria-pressed={on}
                                                            onClick={() => setSelectedPlayerIds((cur) =>
                                                                on ? cur.filter((x) => x !== player.id) : [...cur, player.id])}>
                                                            <span className="team-player-name">{player.name}</span>
                                                            <span className="team-player-meta">
                                                                {t.sc_class_prefix} {player.classLevel} · {catLabel(player.ageCategory)}
                                                            </span>
                                                        </button>
                                                        {tags.length > 0 && (
                                                            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                                                                {tags.map((tag, i) => chip(tag))}
                                                            </div>
                                                        )}
                                                        {isJunior && on && (
                                                            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                                                                {(["junior", "class", "both"] as const).map((m) => (
                                                                    <button key={m} type="button"
                                                                        style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: 4, border: "1px solid currentColor", opacity: mode === m ? 1 : 0.4, fontWeight: mode === m ? 700 : 400, background: "none", cursor: "pointer" }}
                                                                        onClick={() => setJuniorMode((cur) => ({ ...cur, [player.id]: m }))}>
                                                                        {m === "junior" ? "Junior" : m === "class" ? (lang === "sv" ? "Klass" : "Class") : (lang === "sv" ? "Båda" : "Both")}
                                                                    </button>
                                                                ))}
                                                                {(mode === "class" || mode === "both") && (
                                                                    <>
                                                                        <button type="button"
                                                                            style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: 4, border: "1px solid currentColor", opacity: gender === "herr" ? 1 : 0.4, fontWeight: gender === "herr" ? 700 : 400, background: "none", cursor: "pointer" }}
                                                                            onClick={() => setJuniorGender((cur) => ({ ...cur, [player.id]: "herr" }))}>
                                                                            {t.reg_mr}
                                                                        </button>
                                                                        <button type="button"
                                                                            style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: 4, border: "1px solid currentColor", opacity: gender === "dam" ? 1 : 0.4, fontWeight: gender === "dam" ? 700 : 400, background: "none", cursor: "pointer" }}
                                                                            onClick={() => setJuniorGender((cur) => ({ ...cur, [player.id]: "dam" }))}>
                                                                            {t.reg_mrs}
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </section>
                        );
                    });
                })()}
            </div>
        );
    }

    // ── LANE ASSIGNMENT ──
    if (view === "lanes") {
        const activePlayers = players;
        const lanes = Array.from({ length: laneCount }, (_, i) => i + 1);
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{selectedComp?.name}</p>
                        <h1>{t.sc_lane_eyebrow}</h1>
                        <p>
                            {Object.keys(laneAssignments).length}{" "}
                            {lang === "sv" ? "av" : "of"}{" "}
                            {activePlayers.length} {t.sc_player_p}{" "}
                            {lang === "sv" ? "tilldelade." : "assigned."}
                        </p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={goBack}>
                        <ArrowLeft size={17} aria-hidden="true" /> {t.sc_back}
                    </button>
                </div>

                <section className="score-controls">
                    <button className="secondary-action score-button" type="button" onClick={saveFlow}>
                        <Save size={15} aria-hidden="true" /> {status === "saved" ? (lang === "sv" ? "Sparat!" : "Saved!") : (lang === "sv" ? "Spara" : "Save")}
                    </button>
                    <button className="primary-action score-button" type="button" onClick={proceedFromLanes}>
                        {t.sc_lane_cont}
                    </button>
                </section>

                <div className="lane-selector-row">
                    {lanes.map((lane) => {
                        const count = activePlayers.filter((p) => laneAssignments[p.id] === lane).length;
                        return (
                            <button key={lane} type="button"
                                className={activeLane === lane ? "lane-chip active" : "lane-chip"}
                                onClick={() => setActiveLane(activeLane === lane ? null : lane)}>
                                {t.sc_lane_prefix} {lane}
                                <span className="lane-chip-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                {activeLane ? (
                    compClubs.map((club) => {
                        const cp = activePlayers.filter((p) => (p.club || "—") === club);
                        return (
                            <section key={club} className="team-club-section">
                                <h3 className="team-club-title">{club}</h3>
                                <div className="team-player-grid">
                                    {cp.map((player) => {
                                        const playerLane = laneAssignments[player.id];
                                        const onActive   = playerLane === activeLane;
                                        const onOther    = playerLane !== undefined && !onActive;
                                        return (
                                            <button key={player.id} type="button"
                                                className={["team-player-card", onActive ? "is-pending" : "", onOther ? "is-assigned" : ""].filter(Boolean).join(" ")}
                                                onClick={() => toggleLanePlayer(player.id)}>
                                                <span className="team-player-name">{player.name}</span>
                                                <span className="team-player-meta">
                                                    {t.sc_class_prefix} {player.classLevel} · {catLabel(player.ageCategory)}
                                                </span>
                                                {playerLane && <span className="team-badge">{t.sc_lane_prefix} {playerLane}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })
                ) : (
                    <p className="form-message">{t.sc_select_lane_hint}</p>
                )}
            </div>
        );
    }

    // ── TEAM SETUP ──
    if (view === "teams") {
        const assignedIds = new Set(teamAssignments.flatMap((tm) => tm.playerIds));
        const activeTeam  = teamAssignments.find((tm) => tm.id === activeTeamId) ?? null;
        const activeTeamFull = (activeTeam?.playerIds.length ?? 0) >= 4;
        const completeCount  = teamAssignments.filter((tm) => tm.playerIds.length === 4).length;

        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{selectedComp?.name}</p>
                        <h1>{t.sc_team_eyebrow}</h1>
                        <p>
                            {completeCount} {completeCount === 1 ? t.sc_team_s : t.sc_team_p}{" "}
                            {lang === "sv" ? "kompletta." : "complete."}
                        </p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={goBack}>
                        <ArrowLeft size={17} aria-hidden="true" /> {t.sc_back}
                    </button>
                </div>

                <section className="score-controls">
                    <button className="secondary-action score-button" type="button" onClick={addTeam}>
                        {t.sc_add_team}
                    </button>
                    <button className="secondary-action score-button" type="button" onClick={saveFlow}>
                        <Save size={15} aria-hidden="true" /> {status === "saved" ? (lang === "sv" ? "Sparat!" : "Saved!") : (lang === "sv" ? "Spara" : "Save")}
                    </button>
                    <button className="primary-action score-button" type="button"
                        onClick={() => { saveTeams(teamAssignments); setView("scoring"); }}>
                        {t.sc_continue_scoring}
                    </button>
                </section>

                {teamAssignments.length === 0 ? (
                    <p className="form-message">{t.sc_add_team_hint}</p>
                ) : (
                    <div className="team-slot-row">
                        {teamAssignments.map((team) => {
                            const isActive   = team.id === activeTeamId;
                            const isComplete = team.playerIds.length === 4;
                            return (
                                <div key={team.id}
                                    className={["team-slot-card", isActive ? "is-active" : "", isComplete ? "is-complete" : ""].filter(Boolean).join(" ")}
                                    role="button" tabIndex={0}
                                    onClick={() => setActiveTeamId(team.id)}
                                    onKeyDown={(e) => e.key === "Enter" && setActiveTeamId(team.id)}>
                                    <div className="team-slot-card-header">
                                        <input className="team-name-input" value={team.name}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updateTeamName(team.id, e.target.value)} />
                                        <button className="team-slot-remove" type="button"
                                            onClick={(e) => { e.stopPropagation(); removeTeam(team.id); }}>×</button>
                                    </div>
                                    <ol className="team-slot-list">
                                        {[0,1,2,3].map((i) => {
                                            const pid  = team.playerIds[i];
                                            const name = pid ? players.find((p) => p.id === pid)?.name : null;
                                            return (
                                                <li key={i} className={name ? "filled" : "empty"}>
                                                    {name ?? "—"}
                                                    {pid && (
                                                        <button type="button" className="team-slot-unassign"
                                                            onClick={(e) => { e.stopPropagation(); togglePlayerInTeam(pid); setActiveTeamId(team.id); }}>×</button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ol>
                                    {isComplete && <span className="team-complete-badge">{t.sc_team_complete}</span>}
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTeamId && (
                    <>
                        <p className="team-pick-label">
                            {lang === "sv" ? "Väljer spelare för" : "Picking players for"}{" "}
                            <strong>{activeTeam?.name}</strong> — {activeTeam?.playerIds.length ?? 0} / 4
                        </p>
                        {compClubs.map((club) => {
                            const cp = players.filter((p) => (p.club || "—") === club);
                            return (
                                <section key={club} className="team-club-section">
                                    <h3 className="team-club-title">{club}</h3>
                                    <div className="team-player-grid">
                                        {cp.map((player) => {
                                            const inActive = activeTeam?.playerIds.includes(player.id) ?? false;
                                            const inOther  = !inActive && assignedIds.has(player.id);
                                            const otherTeam = inOther ? teamAssignments.find((tm) => tm.playerIds.includes(player.id)) : null;
                                            return (
                                                <button key={player.id} type="button"
                                                    className={["team-player-card", inActive ? "is-pending" : "", inOther ? "is-assigned" : ""].filter(Boolean).join(" ")}
                                                    disabled={inOther || (activeTeamFull && !inActive)}
                                                    onClick={() => togglePlayerInTeam(player.id)}>
                                                    <span className="team-player-name">{player.name}</span>
                                                    <span className="team-player-meta">
                                                        {t.sc_class_prefix} {player.classLevel} · {catLabel(player.ageCategory)}
                                                    </span>
                                                    {otherTeam && <span className="team-badge">{otherTeam.name}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </>
                )}
            </div>
        );
    }

    // ── SCORING ──
    const rankings   = rankPlayers(players);
    const rankMap    = new Map(rankings.map((r) => [r.id, r]));
    const scoringRows = players.map((p) => rankMap.get(p.id)!).filter(Boolean);
    const tiedTotals = (() => {
        const counts = new Map<number, number>();
        for (const p of rankings) counts.set(p.total, (counts.get(p.total) ?? 0) + 1);
        return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s));
    })();
    const hasTies = tiedTotals.size > 0;
    const visibleRows = scoringRows.filter((p) =>
        (classFilter === "all" || p.classLevel === classFilter) &&
        (laneScoreFilter === "all" || laneAssignments[p.id] === laneScoreFilter)
    );

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">{t.sc_eyebrow_scoring}</p>
                    <h1>{selectedComp?.name}</h1>
                    <p>{typeName(typeIds, lang)} · {players.length} {t.sc_player_p}</p>
                </div>
                <button className="secondary-action roster-back-button" type="button" onClick={goBack}>
                    <ArrowLeft size={17} aria-hidden="true" /> {t.sc_back}
                </button>
            </div>

            <section className="score-controls">
                <label>
                    {t.sc_class_label}
                    <select value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value === "all" ? "all" : Number(e.target.value) as ClassLevel)}>
                        <option value="all">{t.sc_all_classes}</option>
                        {([1,2,3,4] as ClassLevel[]).map((n) => <option key={n} value={n}>{t.sc_class_prefix} {n}</option>)}
                    </select>
                </label>
                {laneCount > 1 && (
                    <label>
                        {t.sc_lane_label}
                        <select value={laneScoreFilter}
                            onChange={(e) => setLaneScoreFilter(e.target.value === "all" ? "all" : Number(e.target.value))}>
                            <option value="all">{t.sc_all_lanes}</option>
                            {Array.from({ length: laneCount }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>{t.sc_lane_prefix} {n}</option>
                            ))}
                        </select>
                    </label>
                )}
                <button className="secondary-action score-button" type="button"
                    onClick={() => printStartordning({
                        competitionName: selectedComp?.name ?? "",
                        players,
                        laneAssignments,
                        laneCount,
                        laneFilter: laneScoreFilter,
                        lang,
                    })}>
                    <ClipboardList size={17} aria-hidden="true" /> {lang === "sv" ? "Startordning" : "Start list"}
                </button>
                <button className="secondary-action score-button" type="button"
                    onClick={() => printProtokoll({
                        competitionName: selectedComp?.name ?? "",
                        typeName: typeName(typeIds, lang),
                        players,
                        laneAssignments,
                        laneCount,
                        laneFilter: laneScoreFilter,
                        lang,
                    })}>
                    <ClipboardList size={17} aria-hidden="true" /> {lang === "sv" ? "Domarprotokoll" : "Protocol"}
                </button>
                {teamAssignments.length > 0 && (
                    <button className="secondary-action score-button" type="button"
                        onClick={() => setView("teams")}>
                        {lang === "sv" ? "Redigera lag" : "Edit teams"}
                    </button>
                )}
                <button className="secondary-action score-button" type="button"
                    onClick={() => printLaguppställning({
                        competitionName: selectedComp?.name ?? "",
                        players,
                        teamAssignments,
                        lang,
                    })}>
                    <ClipboardList size={17} aria-hidden="true" /> {lang === "sv" ? "Laguppställning" : "Team lineup"}
                </button>
                <button className="secondary-action score-button" type="button"
                    onClick={() => setPhotoStep("upload")}>
                    <Camera size={17} aria-hidden="true" /> {lang === "sv" ? "Importera foto" : "Import photo"}
                </button>
                <label className="secondary-action score-button" style={{ cursor: "pointer" }}>
                    <FileSpreadsheet size={17} aria-hidden="true" /> {lang === "sv" ? "Importera CSV" : "Import CSV"}
                    <input type="file" accept=".csv" style={{ display: "none" }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCsvFile(file);
                            e.target.value = "";
                        }} />
                </label>
                <button className="secondary-action score-button" type="button"
                    onClick={() => { setAddPlayerOpen(true); setAddPlayerSearch(""); setAddPlayerLane(activeLane ?? 1); setAddPlayerTab("search"); }}>
                    <Plus size={17} aria-hidden="true" /> {lang === "sv" ? "Lägg till spelare" : "Add player"}
                </button>
                <a className="secondary-action score-button" href="/results" target="_blank" rel="noopener noreferrer">
                    <Trophy size={17} aria-hidden="true" /> {lang === "sv" ? "Resultat" : "Results"}
                </a>
                <button className="primary-action score-button" type="button" onClick={saveScores}>
                    <Save size={17} aria-hidden="true" /> {t.sc_save_scores}
                </button>
            </section>

            {status !== "idle" && (
                <p className="form-message">
                    {status === "saved" ? t.club_own_saved : (lang === "sv" ? "Poäng återställda." : "Scores reset.")}
                </p>
            )}

            <div className="score-entry-shell">
                <table>
                    <thead>
                        <tr>
                            <th>{t.sc_col_player}</th>
                            {Array.from({ length: 10 }, (_, i) => <th key={i}>R{i + 1}</th>)}
                            {hasTies && <th>{t.sc_col_7m}</th>}
                            <th>{t.sc_col_1_5}</th>
                            <th>{t.sc_col_6_10}</th>
                            <th>{t.sc_col_total}</th>
                            <th>{t.sc_col_rank}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.map((player) => (
                            <tr key={player.id}>
                                <td>
                                    <strong>{player.name}</strong>
                                    <span>{player.club} · {t.sc_class_prefix} {player.classLevel} · </span>
                                    <button type="button" className="cat-badge-btn"
                                        title="Klicka för att ändra kategori"
                                        onClick={() => {
                                            const order: AgeCategory[] = ["herr", "dam", "junior", "minior"];
                                            const next = order[(order.indexOf(player.ageCategory) + 1) % order.length];
                                            setPlayers((cur) => cur.map((p) => p.id === player.id ? { ...p, ageCategory: next } : p));
                                        }}>
                                        {catLabel(player.ageCategory)}
                                    </button>
                                </td>
                                {player.rounds.map((round, idx) => (
                                    <td key={idx}>
                                        <input type="number" inputMode="numeric" min={0} max={100}
                                            value={round} aria-label={`${player.name} R${idx + 1}`}
                                            onChange={(e) => updateRound(player.id, idx, e.target.value)} />
                                    </td>
                                ))}
                                {hasTies && (
                                    <td>
                                        {tiedTotals.has(player.total)
                                            ? <input type="number" inputMode="numeric" min={0}
                                                value={player.sevenMeters}
                                                aria-label={`${player.name} 7m`}
                                                onChange={(e) => {
                                                    const v = Math.max(0, Number(e.target.value) || 0);
                                                    setPlayers((cur) => cur.map((p) => p.id === player.id ? { ...p, sevenMeters: v } : p));
                                                }} />
                                            : null}
                                    </td>
                                )}
                                <td>{player.firstHalf}</td>
                                <td>{player.secondHalf}</td>
                                <td><strong>{player.total}</strong></td>
                                <td>{player.rank}</td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                    <button type="button" className="player-remove-btn"
                                        title={lang === "sv" ? "Redigera spelare" : "Edit player"}
                                        onClick={() => {
                                            setEditPlayerId(player.id);
                                            setEditPlayerForm({ name: player.name, club: player.club, classLevel: player.classLevel, ageCategory: player.ageCategory });
                                        }}>✎</button>
                                    <button type="button" className="player-remove-btn"
                                        title={lang === "sv" ? "Ta bort spelare" : "Remove player"}
                                        onClick={() => {
                                            if (confirm(`${lang === "sv" ? "Ta bort" : "Remove"} ${player.name}?`))
                                                setPlayers((cur) => cur.filter((p) => p.id !== player.id));
                                        }}>✕</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Team rename strip ──────────────────────────────────────── */}
            {teamAssignments.length > 0 && (
                <div className="team-rename-strip">
                    <span className="team-rename-label">{lang === "sv" ? "Lagnamn:" : "Team names:"}</span>
                    {teamAssignments.map((tm) => (
                        <input key={tm.id} className="team-rename-input" value={tm.name}
                            onChange={(e) => updateTeamName(tm.id, e.target.value)} />
                    ))}
                </div>
            )}

            {/* ── Add player modal ───────────────────────────────────────── */}
            {addPlayerOpen && (() => {
                const currentIds = new Set(players.map((p) => p.id));
                const q = addPlayerSearch.toLowerCase().trim();
                const candidates = compPlayers
                    .filter((p) => !currentIds.has(p.id))
                    .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.club ?? "").toLowerCase().includes(q))
                    .slice(0, 30);
                return (
                    <div className="modal-overlay" onClick={() => setAddPlayerOpen(false)}>
                        <div className="modal-card photo-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="photo-modal-header">
                                <h2><Plus size={20} /> {lang === "sv" ? "Lägg till spelare" : "Add player"}</h2>
                                <button className="photo-modal-close" onClick={() => setAddPlayerOpen(false)}>✕</button>
                            </div>
                            {laneCount > 1 && (
                                <div className="add-player-lane-row">
                                    <span>{lang === "sv" ? "Bana:" : "Lane:"}</span>
                                    {Array.from({ length: laneCount }, (_, i) => i + 1).map((n) => (
                                        <button key={n} type="button"
                                            className={addPlayerLane === n ? "lane-count-btn active" : "lane-count-btn"}
                                            onClick={() => setAddPlayerLane(n)}>{n}</button>
                                    ))}
                                </div>
                            )}

                            <div className="add-player-tabs">
                                <button type="button" className={addPlayerTab === "search" ? "active" : ""} onClick={() => setAddPlayerTab("search")}>
                                    {lang === "sv" ? "Sök i register" : "Search roster"}
                                </button>
                                <button type="button" className={addPlayerTab === "new" ? "active" : ""} onClick={() => setAddPlayerTab("new")}>
                                    {lang === "sv" ? "Ny spelare" : "New player"}
                                </button>
                            </div>

                            {addPlayerTab === "new" ? (
                                <div className="add-player-new-form">
                                    <div className="field-grid">
                                        <label>{lang === "sv" ? "Förnamn" : "First name"}
                                            <input value={newPlayerForm.firstName} onChange={(e) => setNewPlayerForm((f) => ({ ...f, firstName: e.target.value }))} />
                                        </label>
                                        <label>{lang === "sv" ? "Efternamn" : "Last name"}
                                            <input value={newPlayerForm.lastName} onChange={(e) => setNewPlayerForm((f) => ({ ...f, lastName: e.target.value }))} />
                                        </label>
                                        <label>{lang === "sv" ? "Klubb" : "Club"}
                                            <input value={newPlayerForm.club} onChange={(e) => setNewPlayerForm((f) => ({ ...f, club: e.target.value }))} />
                                        </label>
                                        <label>{lang === "sv" ? "Klass" : "Class"}
                                            <select value={newPlayerForm.classLevel} onChange={(e) => setNewPlayerForm((f) => ({ ...f, classLevel: Number(e.target.value) as ClassLevel }))}>
                                                {([1,2,3,4] as ClassLevel[]).map((n) => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </label>
                                        <label>{lang === "sv" ? "Kategori" : "Category"}
                                            <select value={newPlayerForm.ageCategory} onChange={(e) => setNewPlayerForm((f) => ({ ...f, ageCategory: e.target.value as AgeCategory }))}>
                                                <option value="herr">{t.reg_mr}</option>
                                                <option value="dam">{t.reg_mrs}</option>
                                                <option value="junior">{t.reg_junior}</option>
                                                <option value="minior">{t.reg_minior}</option>
                                            </select>
                                        </label>
                                    </div>
                                    <div className="photo-actions">
                                        <button type="button" className="primary-action"
                                            disabled={!newPlayerForm.firstName.trim()}
                                            onClick={() => {
                                                const name = `${newPlayerForm.firstName.trim()} ${newPlayerForm.lastName.trim()}`.trim();
                                                const newP: PlayerScore = {
                                                    id: `new-${Date.now()}`,
                                                    name,
                                                    club: newPlayerForm.club,
                                                    classLevel: newPlayerForm.classLevel,
                                                    ageCategory: newPlayerForm.ageCategory,
                                                    rounds: Array(10).fill(0),
                                                    sevenMeters: 0,
                                                };
                                                setPlayers((cur) => [...cur, newP]);
                                                if (laneCount > 1) setLaneAssignments((cur) => ({ ...cur, [newP.id]: addPlayerLane }));
                                                setNewPlayerForm({ firstName: "", lastName: "", club: "", classLevel: 4, ageCategory: "herr" });
                                                setAddPlayerOpen(false);
                                            }}>
                                            {lang === "sv" ? "Lägg till" : "Add"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                            <>
                            <input className="add-player-search" autoFocus
                                placeholder={lang === "sv" ? "Sök namn eller klubb…" : "Search name or club…"}
                                value={addPlayerSearch}
                                onChange={(e) => setAddPlayerSearch(e.target.value)} />
                            <div className="add-player-list">
                                {candidates.length === 0
                                    ? <p className="form-message">{lang === "sv" ? "Inga spelare hittades." : "No players found."}</p>
                                    : candidates.map((p) => (
                                        <button key={p.id} type="button" className="add-player-row"
                                            onClick={() => {
                                                setPlayers((cur) => [...cur, { ...p, rounds: Array(10).fill(0), sevenMeters: 0 }]);
                                                if (laneCount > 1) setLaneAssignments((cur) => ({ ...cur, [p.id]: addPlayerLane }));
                                                setAddPlayerOpen(false);
                                            }}>
                                            <strong>{p.name}</strong>
                                            <span>{p.club} · {t.sc_class_prefix} {p.classLevel} · {catLabel(p.ageCategory)}</span>
                                        </button>
                                    ))
                                }
                            </div>
                            </>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ── Edit player modal ─────────────────────────────────────── */}
            {editPlayerId && (
                <div className="modal-overlay" onClick={() => setEditPlayerId(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
                        <div className="photo-modal-header">
                            <h2>{lang === "sv" ? "Redigera spelare" : "Edit player"}</h2>
                            <button className="photo-modal-close" onClick={() => setEditPlayerId(null)}>✕</button>
                        </div>
                        <div className="add-player-new-form">
                            <div className="field-grid">
                                <label>{lang === "sv" ? "Namn" : "Name"}
                                    <input value={editPlayerForm.name} onChange={(e) => setEditPlayerForm((f) => ({ ...f, name: e.target.value }))} />
                                </label>
                                <label>{lang === "sv" ? "Klubb" : "Club"}
                                    <input value={editPlayerForm.club} onChange={(e) => setEditPlayerForm((f) => ({ ...f, club: e.target.value }))} />
                                </label>
                                <label>{lang === "sv" ? "Klass" : "Class"}
                                    <select value={editPlayerForm.classLevel} onChange={(e) => setEditPlayerForm((f) => ({ ...f, classLevel: Number(e.target.value) as ClassLevel }))}>
                                        {([1,2,3,4] as ClassLevel[]).map((n) => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </label>
                                <label>{lang === "sv" ? "Kategori" : "Category"}
                                    <select value={editPlayerForm.ageCategory} onChange={(e) => setEditPlayerForm((f) => ({ ...f, ageCategory: e.target.value as AgeCategory }))}>
                                        <option value="herr">{t.reg_mr}</option>
                                        <option value="dam">{t.reg_mrs}</option>
                                        <option value="junior">{t.reg_junior}</option>
                                        <option value="minior">{t.reg_minior}</option>
                                    </select>
                                </label>
                            </div>
                            <div className="photo-actions">
                                <button type="button" className="primary-action"
                                    disabled={!editPlayerForm.name.trim()}
                                    onClick={() => {
                                        setPlayers((cur) => cur.map((p) => p.id === editPlayerId ? { ...p, ...editPlayerForm } : p));
                                        setEditPlayerId(null);
                                    }}>
                                    {lang === "sv" ? "Spara" : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CSV import modal ───────────────────────────────────────── */}
            {csvStep !== "closed" && (
                <div className="modal-overlay" onClick={() => setCsvStep("closed")}>
                    <div className="modal-card photo-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="photo-modal-header">
                            <h2><FileSpreadsheet size={20} /> {lang === "sv" ? "Importera CSV-poäng" : "Import CSV scores"}</h2>
                            <button className="photo-modal-close" onClick={() => setCsvStep("closed")}>✕</button>
                        </div>

                        {csvError && <p className="photo-error">{csvError}</p>}

                        {csvStep === "review" && (() => {
                            const rounds = [...new Set(csvMatches.map((m) => m.round))].sort((a, b) => a - b);
                            return (
                                <>
                                    <p className="photo-hint">
                                        {lang === "sv"
                                            ? `Hittade poäng för omgång ${rounds.map((r) => `R${r}`).join(", ")}. Kontrollera matchningarna och tryck Tillämpa.`
                                            : `Found scores for round ${rounds.map((r) => `R${r}`).join(", ")}. Check matches and press Apply.`}
                                    </p>
                                    <div className="photo-review-table">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>{lang === "sv" ? "Omgång" : "Round"}</th>
                                                    <th>{lang === "sv" ? "CSV-namn" : "CSV name"}</th>
                                                    <th>{lang === "sv" ? "Matchar" : "Matches"}</th>
                                                    <th>{lang === "sv" ? "Poäng" : "Score"}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {csvMatches.map((m, i) => (
                                                    <tr key={i} className={m.matchedId ? "" : "photo-unmatched"}>
                                                        <td>R{m.round}</td>
                                                        <td>{m.csvName}</td>
                                                        <td>
                                                            <select
                                                                value={m.matchedId ?? ""}
                                                                onChange={(e) => setCsvMatches((cur) =>
                                                                    cur.map((cm, j) => j === i ? { ...cm, matchedId: e.target.value || null } : cm)
                                                                )}
                                                            >
                                                                <option value="">– {lang === "sv" ? "ingen" : "none"} –</option>
                                                                {players.map((p) => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td><strong>{m.score}</strong></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="photo-actions">
                                        <button className="secondary-action" onClick={() => setCsvStep("closed")}>
                                            {lang === "sv" ? "Avbryt" : "Cancel"}
                                        </button>
                                        <button className="primary-action" onClick={applyCsvScores}>
                                            {lang === "sv" ? "Tillämpa poäng" : "Apply scores"}
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ── Photo import modal ─────────────────────────────────────── */}
            {photoStep !== "closed" && (
                <div className="modal-overlay" onClick={() => setPhotoStep("closed")}>
                    <div className="modal-card photo-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="photo-modal-header">
                            <h2><Camera size={20} /> {lang === "sv" ? "Importera poäng från foto" : "Import scores from photo"}</h2>
                            <button className="photo-modal-close" onClick={() => setPhotoStep("closed")}>✕</button>
                        </div>

                        {photoStep === "upload" && (
                            <>
                                {!photoApiKey && (
                                    <div className="photo-key-section">
                                        <p>{lang === "sv" ? "Ange din Anthropic API-nyckel:" : "Enter your Anthropic API key:"}</p>
                                        <input
                                            type="password"
                                            placeholder="sk-ant-..."
                                            value={photoApiKey}
                                            onChange={(e) => setPhotoApiKey(e.target.value)}
                                        />
                                        <button className="secondary-action" onClick={() => {
                                            localStorage.setItem("hsc-anthropic-key", photoApiKey);
                                        }}>
                                            {lang === "sv" ? "Spara nyckel" : "Save key"}
                                        </button>
                                    </div>
                                )}
                                {photoApiKey && (
                                    <p className="photo-hint">
                                        {lang === "sv"
                                            ? "Ta ett foto av protokollet och välj det nedan. Claude läser av namnen och poängen automatiskt."
                                            : "Take a photo of the scorecard and select it below. Claude will read names and scores automatically."}
                                    </p>
                                )}
                                <label className={`photo-upload-btn${!photoApiKey ? " disabled" : ""}`}>
                                    <Camera size={22} />
                                    {lang === "sv" ? "Välj foto / kamera" : "Choose photo / camera"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        disabled={!photoApiKey}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handlePhotoFile(file);
                                            e.target.value = "";
                                        }}
                                    />
                                </label>
                                {photoError && <p className="photo-error">{photoError}</p>}
                            </>
                        )}

                        {photoStep === "analyzing" && (
                            <div className="photo-analyzing">
                                <div className="photo-spinner" />
                                <p>{lang === "sv" ? "Claude analyserar bilden…" : "Claude is analyzing the image…"}</p>
                            </div>
                        )}

                        {photoStep === "review" && (
                            <>
                                <div className="photo-half-select">
                                    <span>{lang === "sv" ? "Omgångar:" : "Rounds:"}</span>
                                    <label>
                                        <input type="radio" checked={photoHalf === "first"} onChange={() => setPhotoHalf("first")} />
                                        {lang === "sv" ? "Första halvlek (R1–R5)" : "First half (R1–R5)"}
                                    </label>
                                    <label>
                                        <input type="radio" checked={photoHalf === "second"} onChange={() => setPhotoHalf("second")} />
                                        {lang === "sv" ? "Andra halvlek (R6–R10)" : "Second half (R6–R10)"}
                                    </label>
                                </div>

                                <div className="photo-review-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>{lang === "sv" ? "Igenkänt" : "Recognized"}</th>
                                                <th>{lang === "sv" ? "Matchar" : "Matches"}</th>
                                                <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {photoMatches.map((m, i) => (
                                                <tr key={i} className={m.matchedId ? "" : "photo-unmatched"}>
                                                    <td>{m.name}</td>
                                                    <td>
                                                        <select
                                                            value={m.matchedId ?? ""}
                                                            onChange={(e) => setPhotoMatches((cur) =>
                                                                cur.map((pm, j) => j === i ? { ...pm, matchedId: e.target.value || null } : pm)
                                                            )}
                                                        >
                                                            <option value="">– {lang === "sv" ? "ingen" : "none"} –</option>
                                                            {players.map((p) => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    {m.rounds.map((r, ri) => <td key={ri}>{r || "–"}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="photo-actions">
                                    <button className="secondary-action" onClick={() => setPhotoStep("upload")}>
                                        {lang === "sv" ? "Nytt foto" : "New photo"}
                                    </button>
                                    <button className="primary-action" onClick={applyPhotoScores}>
                                        {lang === "sv" ? "Tillämpa poäng" : "Apply scores"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Club dashboard ────────────────────────────────────────────────────────────

export default function ClubPage() {
    const { t, lang } = useLanguage();
    const { players: basePlayers, loading: baseLoading, savePlayers } = usePlayers();
    const knownClubs = useMemo(
        () => [...new Set(basePlayers.map((p) => p.club).filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv")),
        [basePlayers],
    );

    const [clubName, setClubName] = useState<string | null>(getSavedSession);
    const [tab, setTab]           = useState<"players" | "competition" | "our" | "settings">("players");
    const [players,  setPlayers]  = useState<ClubPlayer[]>([]);
    const [syncError, setSyncError] = useState<string | null>(null);

    useEffect(() => {
        if (baseLoading || !clubName) return;
        const roster = loadClubRoster(clubName, basePlayers);
        const regs: RegEntry[] = (() => {
            try { return JSON.parse(localStorage.getItem(REGISTRATIONS_KEY) ?? "[]"); }
            catch { return []; }
        })();
        const rosterNames = new Set(roster.map((p) => p.name.toLowerCase()));
        const fromRegs: ClubPlayer[] = regs
            .filter((r) => r.club?.toLowerCase() === clubName.toLowerCase())
            .filter((r) => !PAIR_CATS.includes(r.category))
            .filter((r) => !rosterNames.has(`${r.firstName} ${r.lastName}`.trim().toLowerCase()))
            .map((r) => ({
                id: `reg-${r.createdAt ?? Date.now()}`,
                name: `${r.firstName} ${r.lastName}`.trim(),
                club: r.club,
                classLevel: (Number(r.category) || 4) as ClassLevel,
                ageCategory: titleToAgeCategory(r.title),
            }));
        const merged = fromRegs.length === 0 ? roster : [...roster, ...fromRegs];
        if (fromRegs.length > 0) saveClubRoster(clubName, merged);
        setPlayers(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseLoading, clubName]);
    const [showAdd,     setShowAdd]     = useState(false);
    const [editPlayer,  setEditPlayer]  = useState<ClubPlayer | null>(null);
    const [newName,     setNewName]     = useState("");
    const [newClass,    setNewClass]    = useState<ClassLevel>(4);
    const [newCategory, setNewCategory] = useState<AgeCategory>("herr");

    const competitions = loadCompetitions()
        .filter((c) => c.registrationOpen)
        .sort((a, b) => a.date.localeCompare(b.date));
    const [selectedComp,    setSelectedComp]    = useState("");
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [regStatus,       setRegStatus]       = useState<"idle" | "sent" | "saving" | "error">("idle");
    const [mixPairs,        setMixPairs]        = useState<{ p1Id: string; p2Id: string }[]>([]);
    const [mixP1,           setMixP1]           = useState("");
    const [mixP2,           setMixP2]           = useState("");
    const [regTab,          setRegTab]          = useState<"individual" | "lag" | "mix" | "dubbel">("individual");
    const [regTeams,        setRegTeams]        = useState<{ id: string; name: string; playerIds: string[] }[]>([]);
    const [regDubbel,       setRegDubbel]       = useState<{ p1Id: string; p2Id: string }[]>([]);
    const [regDubbelP1,     setRegDubbelP1]     = useState("");
    const [regDubbelP2,     setRegDubbelP2]     = useState("");

    if (!clubName) {
        return (
            <ClubLogin
                knownClubs={knownClubs}
                onLogin={(name) => {
                    setClubName(name);
                    setPlayers(loadClubRoster(name, basePlayers));
                }}
            />
        );
    }

    function saveAndSet(next: ClubPlayer[]) {
        if (!clubName) return;
        saveClubRoster(clubName, next);
        setPlayers(next);
        setSyncError(null);
        const others = basePlayers.filter(
            (p) => p.club.toLowerCase() !== clubName.toLowerCase(),
        );
        const merged = [
            ...others,
            ...next.map((p) => ({ ...p, rounds: [0,0,0,0,0,0,0,0,0,0] as number[], sevenMeters: 0 })),
        ];
        savePlayers(merged).catch((err: unknown) => {
            setSyncError(err instanceof Error ? err.message : "GitHub save failed");
        });
    }

    function handleLogout() {
        sessionStorage.removeItem(CLUB_SESSION_KEY);
        setClubName(null);
    }

    function addPlayer(e: FormEvent) {
        e.preventDefault();
        if (!newName.trim()) return;
        saveAndSet([...players, {
            id: `club-${Date.now()}`,
            name: newName.trim(),
            club: clubName ?? "",
            classLevel: newClass,
            ageCategory: newCategory,
        }]);
        setNewName(""); setNewClass(4); setNewCategory("herr");
        setShowAdd(false);
    }

    function saveEdit() {
        if (!editPlayer) return;
        const updated = players.map((p) => p.id === editPlayer.id ? editPlayer : p);
        // Remove player from this club's list if their club was changed
        const filtered = updated.filter((p) => p.club.toLowerCase() === (clubName ?? "").toLowerCase());
        saveAndSet(filtered);
        setEditPlayer(null);
    }

    function deletePlayer(id: string) {
        saveAndSet(players.filter((p) => p.id !== id));
        if (id.startsWith("reg-")) {
            const createdAt = id.slice(4);
            try {
                const regs: RegEntry[] = JSON.parse(localStorage.getItem(REGISTRATIONS_KEY) ?? "[]");
                localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(regs.filter((r) => r.createdAt !== createdAt)));
            } catch { /* empty */ }
        }
    }

    function toggleRegPlayer(id: string) {
        setSelectedPlayers((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    function playerToTitle(p: ClubPlayer) {
        return p.ageCategory === "dam" ? "mrs" : p.ageCategory === "junior" ? "junior" : p.ageCategory === "minior" ? "minior" : "mr";
    }
    function playerToEntry(p: ClubPlayer, cat: string, ts: string, extra?: Partial<RegEntry>): RegEntry {
        const [firstName, ...rest] = p.name.split(" ");
        return { firstName, lastName: rest.join(" "), club: p.club, category: cat, title: playerToTitle(p), createdAt: ts, competitionId: selectedComp ?? undefined, ...extra };
    }

    async function submitRegistration(e: FormEvent) {
        e.preventDefault();
        const hasAny = selectedPlayers.length > 0 || mixPairs.length > 0 || regDubbel.length > 0 || regTeams.some((t) => t.playerIds.length > 0);
        if (!selectedComp || !hasAny) return;
        const entries: RegEntry[] = [];

        // Individual
        for (const pid of selectedPlayers) {
            const p = players.find((pl) => pl.id === pid);
            if (p) entries.push(playerToEntry(p, String(p.classLevel), new Date().toISOString()));
        }
        // Mix dubbel
        for (const { p1Id, p2Id } of mixPairs) {
            const p1 = players.find((p) => p.id === p1Id);
            const p2 = players.find((p) => p.id === p2Id);
            if (!p1 || !p2) continue;
            const ts = new Date().toISOString();
            entries.push(playerToEntry(p1, "mix-d", ts, { pairWith: p2.name }));
            entries.push(playerToEntry(p2, "mix-d", ts + "-2", { pairWith: p1.name }));
        }
        // Dubbel
        for (const { p1Id, p2Id } of regDubbel) {
            const p1 = players.find((p) => p.id === p1Id);
            const p2 = players.find((p) => p.id === p2Id);
            if (!p1 || !p2) continue;
            const ts = new Date().toISOString();
            entries.push(playerToEntry(p1, "dubbel", ts, { pairWith: p2.name }));
            entries.push(playerToEntry(p2, "dubbel", ts + "-2", { pairWith: p1.name }));
        }
        // Lag
        for (const team of regTeams) {
            if (team.playerIds.length === 0) continue;
            const ts = new Date().toISOString();
            team.playerIds.forEach((pid, i) => {
                const p = players.find((pl) => pl.id === pid);
                if (p) entries.push(playerToEntry(p, "lag", ts + `-${i}`, { teamId: team.name }));
            });
        }

        setRegStatus("saving");
        const results = await Promise.all(
            entries.map((r) => supabase.from('registrations').insert(regEntryToRow(r)))
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) {
            setRegStatus("error");
            setTimeout(() => setRegStatus("idle"), 6000);
            return;
        }

        setRegStatus("sent");
        setSelectedPlayers([]);
        setMixPairs([]); setMixP1(""); setMixP2("");
        setRegDubbel([]); setRegDubbelP1(""); setRegDubbelP2("");
        setRegTeams([]);
        setTimeout(() => setRegStatus("idle"), 4000);
    }

    const catOptions: { value: AgeCategory; label: string }[] = [
        { value: "herr", label: t.reg_mr }, { value: "dam", label: t.reg_mrs },
        { value: "junior", label: t.reg_junior }, { value: "minior", label: t.reg_minior },
    ];

    return (
        <main className="public-page">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="HSC home">
                    <span className="brand-mark">HSC</span>
                    <span>{t.brand_subtitle}</span>
                </Link>
                <a className="svhkf-logo-link" href="https://www.svhkf.se/" target="_blank" rel="noopener noreferrer">
                    <img className="svhkf-logo" src="/svhkf-logo.png" alt="Sv HKF" />
                </a>
                <div className="club-header-right">
                    <span className="club-session-chip">{clubName}</span>
                    <button className="secondary-action club-logout-btn" type="button" onClick={handleLogout}>
                        {t.club_logout}
                    </button>
                    <LangSelect />
                </div>
            </header>

            <div className="club-shell">
                <div className="club-intro">
                    <p className="eyebrow">{t.club_eyebrow}</p>
                    <h1>{clubName}</h1>
                    <p>{t.club_desc}</p>
                </div>

                {syncError && (
                    <p style={{ color: "var(--color-error, red)", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
                        ⚠ GitHub sync failed: {syncError}
                    </p>
                )}

                {/* ── Tabs ── */}
                <div className="club-tabs" role="tablist">
                    <button className={tab === "players" ? "club-tab active" : "club-tab"}
                        type="button" role="tab" aria-selected={tab === "players"}
                        onClick={() => setTab("players")}>
                        <Users size={15} aria-hidden="true" />
                        <span className="tab-label">{t.club_tab_players}</span>
                        <span className="club-tab-count">{players.length}</span>
                    </button>
                    <button className={tab === "competition" ? "club-tab active" : "club-tab"}
                        type="button" role="tab" aria-selected={tab === "competition"}
                        onClick={() => setTab("competition")}>
                        <ClipboardList size={15} aria-hidden="true" />
                        <span className="tab-label">{t.club_tab_competition}</span>
                    </button>
                    <button className={tab === "our" ? "club-tab active" : "club-tab"}
                        type="button" role="tab" aria-selected={tab === "our"}
                        onClick={() => setTab("our")}>
                        <Trophy size={15} aria-hidden="true" />
                        <span className="tab-label">{t.club_tab_our}</span>
                    </button>
                    <button className={tab === "settings" ? "club-tab active" : "club-tab"}
                        type="button" role="tab" aria-selected={tab === "settings"}
                        onClick={() => setTab("settings")}>
                        <Settings size={15} aria-hidden="true" />
                        <span className="tab-label">{t.club_tab_settings}</span>
                    </button>
                </div>

                {/* ── Players tab ── */}
                {tab === "players" && (
                    <div className="club-players-section">
                        <div className="club-section-header">
                            <span className="success-pill">{players.length} {t.club_player_count}</span>
                            <button className="primary-action score-button" type="button"
                                onClick={() => { setShowAdd((v) => !v); setNewName(""); setNewClass(4); setNewCategory("herr"); }}>
                                <Plus size={16} aria-hidden="true" />
                                {t.club_add_player}
                            </button>
                        </div>

                        {showAdd && (
                            <form className="club-add-form" onSubmit={addPlayer}>
                                <div className="field-grid">
                                    <label>
                                        {t.players_col_name}
                                        <input type="text" required value={newName} placeholder={t.club_name_ph}
                                            onChange={(e) => setNewName(e.target.value)} />
                                    </label>
                                    <label>
                                        {t.players_col_class}
                                        <select value={newClass} onChange={(e) => setNewClass(Number(e.target.value) as ClassLevel)}>
                                            {[1,2,3,4].map((n) => <option key={n} value={n}>{t.sc_class_prefix} {n}</option>)}
                                        </select>
                                    </label>
                                    <label>
                                        {t.players_col_category}
                                        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as AgeCategory)}>
                                            {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </label>
                                </div>
                                <div className="comp-form-actions">
                                    <button className="secondary-action score-button" type="button" onClick={() => setShowAdd(false)}>
                                        {t.players_cancel}
                                    </button>
                                    <button className="primary-action score-button" type="submit">
                                        {t.players_save}
                                    </button>
                                </div>
                            </form>
                        )}

                        {players.length === 0 ? (
                            <p className="club-empty">{t.club_no_players}</p>
                        ) : (
                            <div className="table-shell club-players-panel">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t.players_col_name}</th>
                                            <th>{t.players_col_class}</th>
                                            <th>{t.players_col_category}</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {players.map((p) => (
                                            <tr key={p.id}>
                                                <td><strong>{p.name}</strong></td>
                                                <td>{t.sc_class_prefix} {p.classLevel}</td>
                                                <td>{ageCatLabel(p.ageCategory, t)}</td>
                                                <td className="club-player-actions">
                                                    <button type="button" className="secondary-action"
                                                        aria-label={`${t.players_edit_btn} ${p.name}`}
                                                        onClick={() => setEditPlayer({ ...p })}>
                                                        <Pencil size={14} aria-hidden="true" />
                                                        <span className="btn-label">{t.players_edit_btn}</span>
                                                    </button>
                                                    <button type="button" className="comp-delete-btn"
                                                        aria-label={`${t.comps_delete} ${p.name}`}
                                                        onClick={() => deletePlayer(p.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Competition registration tab ── */}
                {tab === "competition" && (
                    <div className="club-comp-section">
                        {competitions.length === 0 ? (
                            <p className="club-empty">{t.club_no_comp}</p>
                        ) : (
                            <form className="club-comp-form" onSubmit={submitRegistration}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                    <p className="club-comp-pick-label" style={{ margin: 0 }}>{t.club_choose_comp}</p>
                                    {selectedComp && (
                                        <button type="button" className="secondary-action"
                                            style={{ padding: "2px 10px", fontSize: "0.8rem" }}
                                            onClick={() => { setSelectedComp(""); setSelectedPlayers([]); setRegStatus("idle"); setMixPairs([]); setMixP1(""); setMixP2(""); setRegTab("individual"); setRegTeams([]); setRegDubbel([]); setRegDubbelP1(""); setRegDubbelP2(""); }}>
                                            <ArrowLeft size={13} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 3 }} />
                                            {lang === "sv" ? "Byt tävling" : "Change"}
                                        </button>
                                    )}
                                </div>
                                <div className="club-comp-grid">
                                    {competitions.filter((c) => !selectedComp || c.id === selectedComp).map((c) => {
                                        const d = new Date(c.date + "T12:00:00");
                                        const day = d.getDate();
                                        const mon = d.toLocaleString("sv-SE", { month: "short" }).toUpperCase();
                                        const year = d.getFullYear();
                                        const active = selectedComp === c.id;
                                        return (
                                            <button key={c.id} type="button"
                                                className={active ? "club-comp-card active" : "club-comp-card"}
                                                onClick={() => { setSelectedComp(c.id); setSelectedPlayers([]); setRegStatus("idle"); setMixPairs([]); setMixP1(""); setMixP2(""); setRegTab("individual"); setRegTeams([]); setRegDubbel([]); setRegDubbelP1(""); setRegDubbelP2(""); }}
                                                aria-pressed={active}>
                                                <span className="club-comp-date-badge">
                                                    <span>{mon}</span>
                                                    <strong>{day}</strong>
                                                    <span>{year}</span>
                                                </span>
                                                <span className="club-comp-info">
                                                    <strong>{c.name}</strong>
                                                    {c.location && <span>{c.location}</span>}
                                                    {c.organizer && <span>{c.organizer}</span>}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedComp && (
                                    <>
                                        {/* Sub-tabs */}
                                        <div className="club-tab-bar" style={{ marginTop: "1rem", marginBottom: "0.75rem" }}>
                                            {(["individual", "lag", "mix", "dubbel"] as const).map((rt) => (
                                                <button key={rt} type="button"
                                                    className={regTab === rt ? "club-tab active" : "club-tab"}
                                                    onClick={() => setRegTab(rt)}>
                                                    {rt === "individual" ? (lang === "sv" ? "Individuell" : "Individual") :
                                                     rt === "lag"        ? (lang === "sv" ? "Lag" : "Team") :
                                                     rt === "mix"        ? "Mix" : "Dubbel"}
                                                    {rt === "individual" && selectedPlayers.length > 0 && <span className="club-tab-count">{selectedPlayers.length}</span>}
                                                    {rt === "lag"        && regTeams.length > 0           && <span className="club-tab-count">{regTeams.length}</span>}
                                                    {rt === "mix"        && mixPairs.length > 0            && <span className="club-tab-count">{mixPairs.length}</span>}
                                                    {rt === "dubbel"     && regDubbel.length > 0           && <span className="club-tab-count">{regDubbel.length}</span>}
                                                </button>
                                            ))}
                                        </div>

                                        {/* ── Individuell ── */}
                                        {regTab === "individual" && (
                                            players.length === 0 ? (
                                                <p className="club-empty">{t.club_no_players}</p>
                                            ) : (
                                                <div className="club-player-pick-grid">
                                                    {players.map((p) => {
                                                        const checked = selectedPlayers.includes(p.id);
                                                        return (
                                                            <button key={p.id} type="button"
                                                                className={checked ? "club-player-pick active" : "club-player-pick"}
                                                                onClick={() => toggleRegPlayer(p.id)}
                                                                aria-pressed={checked}>
                                                                <strong>{p.name}</strong>
                                                                <span>{t.sc_class_prefix} {p.classLevel} · {ageCatLabel(p.ageCategory, t)}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )
                                        )}

                                        {/* ── Lag ── */}
                                        {regTab === "lag" && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                                {regTeams.map((team, ti) => (
                                                    <div key={team.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
                                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                                                            <input value={team.name}
                                                                style={{ flex: 1, fontWeight: 600 }}
                                                                onChange={(e) => setRegTeams((cur) => cur.map((t, i) => i === ti ? { ...t, name: e.target.value } : t))} />
                                                            <button type="button" className="team-slot-remove"
                                                                onClick={() => setRegTeams((cur) => cur.filter((_, i) => i !== ti))}>×</button>
                                                        </div>
                                                        <div className="club-player-pick-grid">
                                                            {players.map((p) => {
                                                                const inThisTeam = team.playerIds.includes(p.id);
                                                                const inOther    = regTeams.some((t, i) => i !== ti && t.playerIds.includes(p.id));
                                                                const teamFull   = team.playerIds.length >= 4 && !inThisTeam;
                                                                return (
                                                                    <button key={p.id} type="button"
                                                                        className={inThisTeam ? "club-player-pick active" : "club-player-pick"}
                                                                        style={{ opacity: (inOther || teamFull) ? 0.35 : 1 }}
                                                                        disabled={inOther || teamFull}
                                                                        onClick={() => setRegTeams((cur) => cur.map((t, i) => i !== ti ? t : {
                                                                            ...t, playerIds: inThisTeam
                                                                                ? t.playerIds.filter((id) => id !== p.id)
                                                                                : t.playerIds.length < 4 ? [...t.playerIds, p.id] : t.playerIds,
                                                                        }))}>
                                                                        <strong>{p.name}</strong>
                                                                        <span>{t.sc_class_prefix} {p.classLevel}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <p style={{ fontSize: "0.8rem", color: team.playerIds.length === 4 ? "var(--color-success, #22c55e)" : "var(--muted)", margin: "0.4rem 0 0" }}>
                                                            {team.playerIds.length} / 4 {lang === "sv" ? "spelare" : "players"}
                                                            {team.playerIds.length === 4 && (lang === "sv" ? " — laget är fullt" : " — team is full")}
                                                        </p>
                                                    </div>
                                                ))}
                                                <button type="button" className="secondary-action score-button"
                                                    onClick={() => setRegTeams((cur) => [...cur, { id: String(Date.now()), name: `${lang === "sv" ? "Lag" : "Team"} ${cur.length + 1}`, playerIds: [] }])}>
                                                    + {lang === "sv" ? "Lägg till lag" : "Add team"}
                                                </button>
                                            </div>
                                        )}

                                        {/* ── Mix dubbel ── */}
                                        {regTab === "mix" && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                                {mixPairs.map(({ p1Id, p2Id }, i) => {
                                                    const p1 = players.find((p) => p.id === p1Id);
                                                    const p2 = players.find((p) => p.id === p2Id);
                                                    return (
                                                        <div key={i} className="mix-pair-row">
                                                            <span>{p1?.name}</span>
                                                            <span className="mix-pair-sep">+</span>
                                                            <span>{p2?.name}</span>
                                                            <button type="button" className="team-slot-remove"
                                                                onClick={() => setMixPairs((cur) => cur.filter((_, j) => j !== i))}>×</button>
                                                        </div>
                                                    );
                                                })}
                                                <div className="mix-pair-builder">
                                                    <select value={mixP1} onChange={(e) => setMixP1(e.target.value)}>
                                                        <option value="">{lang === "sv" ? "— Välj herr/junior" : "— Pick male/junior"}</option>
                                                        {players.filter((p) => p.ageCategory !== "dam").map((p) => (
                                                            <option key={p.id} value={p.id} disabled={p.id === mixP2}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                    <span className="mix-pair-sep">+</span>
                                                    <select value={mixP2} onChange={(e) => setMixP2(e.target.value)}>
                                                        <option value="">{lang === "sv" ? "— Välj dam" : "— Pick female"}</option>
                                                        {players.filter((p) => p.ageCategory === "dam").map((p) => (
                                                            <option key={p.id} value={p.id} disabled={p.id === mixP1}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                    <button type="button" className="secondary-action score-button"
                                                        disabled={!mixP1 || !mixP2}
                                                        onClick={() => { setMixPairs((cur) => [...cur, { p1Id: mixP1, p2Id: mixP2 }]); setMixP1(""); setMixP2(""); }}>
                                                        + {lang === "sv" ? "Lägg till par" : "Add pair"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Dubbel ── */}
                                        {regTab === "dubbel" && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                                {regDubbel.map(({ p1Id, p2Id }, i) => {
                                                    const p1 = players.find((p) => p.id === p1Id);
                                                    const p2 = players.find((p) => p.id === p2Id);
                                                    return (
                                                        <div key={i} className="mix-pair-row">
                                                            <span>{p1?.name}</span>
                                                            <span className="mix-pair-sep">+</span>
                                                            <span>{p2?.name}</span>
                                                            <button type="button" className="team-slot-remove"
                                                                onClick={() => setRegDubbel((cur) => cur.filter((_, j) => j !== i))}>×</button>
                                                        </div>
                                                    );
                                                })}
                                                <div className="mix-pair-builder">
                                                    <select value={regDubbelP1} onChange={(e) => setRegDubbelP1(e.target.value)}>
                                                        <option value="">{lang === "sv" ? "— Välj spelare 1" : "— Pick player 1"}</option>
                                                        {players.map((p) => (
                                                            <option key={p.id} value={p.id} disabled={p.id === regDubbelP2}>{p.name} · {ageCatLabel(p.ageCategory, t)}</option>
                                                        ))}
                                                    </select>
                                                    <span className="mix-pair-sep">+</span>
                                                    <select value={regDubbelP2} onChange={(e) => setRegDubbelP2(e.target.value)}>
                                                        <option value="">{lang === "sv" ? "— Välj spelare 2" : "— Pick player 2"}</option>
                                                        {players.map((p) => (
                                                            <option key={p.id} value={p.id} disabled={p.id === regDubbelP1}>{p.name} · {ageCatLabel(p.ageCategory, t)}</option>
                                                        ))}
                                                    </select>
                                                    <button type="button" className="secondary-action score-button"
                                                        disabled={!regDubbelP1 || !regDubbelP2 || regDubbelP1 === regDubbelP2}
                                                        onClick={() => { setRegDubbel((cur) => [...cur, { p1Id: regDubbelP1, p2Id: regDubbelP2 }]); setRegDubbelP1(""); setRegDubbelP2(""); }}>
                                                        + {lang === "sv" ? "Lägg till par" : "Add pair"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="comp-form-actions" style={{ marginTop: "1.25rem" }}>
                                            <button className="primary-action score-button" type="submit"
                                                disabled={regStatus === "saving" || (selectedPlayers.length === 0 && mixPairs.length === 0 && regDubbel.length === 0 && !regTeams.some((t) => t.playerIds.length > 0))}>
                                                <Send size={16} aria-hidden="true" />
                                                {regStatus === "saving" ? (lang === "sv" ? "Skickar…" : "Sending…") : t.club_submit_reg}
                                            </button>
                                        </div>
                                        {regStatus === "sent" && (
                                            <p className="form-message">{t.club_reg_sent}</p>
                                        )}
                                        {regStatus === "error" && (
                                            <p className="form-message" style={{ color: "var(--color-error, red)" }}>
                                                {lang === "sv" ? "⚠ Kunde inte skicka anmälan. Försök igen." : "⚠ Could not submit registration. Please try again."}
                                            </p>
                                        )}
                                    </>
                                )}
                            </form>
                        )}
                    </div>
                )}

                {/* ── Our competition tab (merged incoming + own) ── */}
                {tab === "our" && (
                    <div>
                        <div className="club-comp-section">
                            <div className="club-section-header">
                                <div>
                                    <p className="eyebrow">{t.club_incoming_eyebrow}</p>
                                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>{t.club_incoming_desc}</p>
                                </div>
                            </div>
                            <IncomingRegistrations clubName={clubName} />
                        </div>
                        <hr style={{ margin: "1.5rem 0", border: "none", borderTop: "1px solid var(--line)" }} />
                        <OwnCompetition clubName={clubName} />
                    </div>
                )}

                {/* ── Settings tab ── */}
                {tab === "settings" && (
                    <ClubSettings clubName={clubName} />
                )}
            </div>

            {/* ── Edit modal ── */}
            {editPlayer && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h2>{t.players_edit_btn} — {editPlayer.name}</h2>
                        <label>{t.players_label_name}</label>
                        <input value={editPlayer.name}
                            onChange={(e) => setEditPlayer({ ...editPlayer, name: e.target.value })} />
                        <label>{t.players_label_club}</label>
                        <select value={editPlayer.club}
                            onChange={(e) => setEditPlayer({ ...editPlayer, club: e.target.value })}>
                            {knownClubs.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <label>{t.players_label_class}</label>
                        <select value={editPlayer.classLevel}
                            onChange={(e) => setEditPlayer({ ...editPlayer, classLevel: Number(e.target.value) as ClassLevel })}>
                            {[1,2,3,4].map((n) => <option key={n} value={n}>{t.sc_class_prefix} {n}</option>)}
                        </select>
                        <label>{t.players_label_category}</label>
                        <select value={editPlayer.ageCategory}
                            onChange={(e) => setEditPlayer({ ...editPlayer, ageCategory: e.target.value as AgeCategory })}>
                            {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <div className="modal-buttons">
                            <button className="primary-action" onClick={saveEdit}>{t.players_save}</button>
                            <button className="secondary-action" onClick={() => setEditPlayer(null)}>{t.players_cancel}</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
