import { CalendarDays, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Competition, loadCompetitions, saveCompetitions } from "../data/competitions";
import { useLanguage } from "../lib/language";

function parseSvhkfDate(raw: string): string {
    const rangeMatch = raw.match(/^(\d+)(?:-\d+)?\/(\d+)\s+(\d{4})$/);
    if (rangeMatch) {
        const [, day, month, year] = rangeMatch;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    const yearOnly = raw.match(/^(\d{4})$/);
    if (yearOnly) return `${yearOnly[1]}-01-01`;
    return "";
}

async function fetchSvhkfCompetitions(): Promise<Omit<Competition, "id" | "registrationOpen">[]> {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://www.svhkf.se/kalender/")}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Failed to fetch calendar");
    const json = await res.json() as { contents: string };
    const doc = new DOMParser().parseFromString(json.contents, "text/html");

    const results: Omit<Competition, "id" | "registrationOpen">[] = [];
    const rows = doc.querySelectorAll("table tr");

    rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 2) return;
        const dateRaw    = cells[0]?.textContent?.trim() ?? "";
        const name       = cells[1]?.textContent?.trim() ?? "";
        const organizer  = cells[2]?.textContent?.trim() ?? "";
        const location   = cells[3]?.textContent?.trim() ?? "";
        const rankingText = cells[4]?.textContent?.trim() ?? "";
        if (!name || !dateRaw) return;
        const date = parseSvhkfDate(dateRaw);
        if (!date) return;
        results.push({ name, date, organizer, location, ranking: rankingText.toLowerCase().startsWith("ja"), source: "svhkf" });
    });

    return results;
}

function slugify(name: string) {
    return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function findRunIds(compName: string): string[] {
    const prefix = slugify(compName) + "__";
    const ids: string[] = [];
    for (const key of Object.keys(localStorage)) {
        let runId: string | null = null;
        if (key.startsWith("hsc-scores-v3-")) runId = key.slice("hsc-scores-v3-".length);
        else if (key.startsWith("hsc-live-v1-"))  runId = key.slice("hsc-live-v1-".length);
        if (runId && runId.startsWith(prefix) && !ids.includes(runId)) ids.push(runId);
    }
    return ids;
}

function activateRun(runId: string, compName: string) {
    const saved = localStorage.getItem(`hsc-scores-v3-${runId}`);
    const live  = localStorage.getItem(`hsc-live-v1-${runId}`);
    const data  = saved || live;
    if (data) localStorage.setItem(`hsc-live-v1-${runId}`, data);
    const typePart = runId.split("__")[1] ?? "";
    localStorage.setItem("hsc-active-v1", JSON.stringify({ runId, contestName: compName, typeName: typePart }));
}

const LOGO_COLORS = [
    "#0f766e","#0369a1","#7c3aed","#b45309","#be123c",
    "#15803d","#9a3412","#1d4ed8","#6d28d9","#0f766e",
];

function clubColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return LOGO_COLORS[h % LOGO_COLORS.length];
}

function clubInitials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const emptyForm = { name: "", date: "", organizer: "", location: "" };

export default function CompetitionsPage() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [competitions, setCompetitions] = useState<Competition[]>(loadCompetitions);
    const [noResultsFor, setNoResultsFor] = useState<string | null>(null);
    const [showForm,    setShowForm]    = useState(false);
    const [form,        setForm]        = useState(emptyForm);
    const [syncStatus,  setSyncStatus]  = useState<"idle" | "loading" | "done" | "error">("idle");

    function handleAdd() {
        if (!form.name.trim() || !form.date) return;
        const next: Competition[] = [
            ...competitions,
            {
                id: `manual-${Date.now()}`,
                name: form.name.trim(),
                date: form.date,
                organizer: form.organizer.trim(),
                location: form.location.trim(),
                ranking: false,
                registrationOpen: true,
                source: "manual",
            },
        ];
        saveCompetitions(next);
        setCompetitions(next);
        setForm(emptyForm);
        setShowForm(false);
    }

    function handleDelete(id: string) {
        const next = competitions.filter((c) => c.id !== id);
        saveCompetitions(next);
        setCompetitions(next);
    }

    function toggleRegistration(id: string) {
        const next = competitions.map((c) =>
            c.id === id ? { ...c, registrationOpen: !c.registrationOpen } : c
        );
        saveCompetitions(next);
        setCompetitions(next);
    }

    async function syncFromSvhkf() {
        setSyncStatus("loading");
        try {
            const fetched = await fetchSvhkfCompetitions();
            setCompetitions((current) => {
                const next = [...current];
                for (const incoming of fetched) {
                    const existing = next.find(
                        (c) => c.name.toLowerCase() === incoming.name.toLowerCase() && c.source === "svhkf"
                    );
                    if (existing) {
                        Object.assign(existing, {
                            date: incoming.date,
                            organizer: incoming.organizer,
                            location: incoming.location,
                            ranking: incoming.ranking,
                        });
                    } else {
                        next.push({ ...incoming, id: `svhkf-${Date.now()}-${Math.random()}`, registrationOpen: true });
                    }
                }
                next.sort((a, b) => a.date.localeCompare(b.date));
                saveCompetitions(next);
                return next;
            });
            setSyncStatus("done");
        } catch {
            setSyncStatus("error");
        }
        setTimeout(() => setSyncStatus("idle"), 3000);
    }

    const syncLabel =
        syncStatus === "loading" ? t.comps_sync_loading :
        syncStatus === "done"    ? t.comps_sync_done    :
        syncStatus === "error"   ? t.comps_sync_error   :
        t.comps_sync_btn;

    function openCompResults(comp: Competition) {
        const runs = findRunIds(comp.name);
        if (runs.length === 0) {
            setNoResultsFor(comp.id);
            setTimeout(() => setNoResultsFor(null), 3000);
            return;
        }
        activateRun(runs[0], comp.name);
        navigate("/admin/results");
    }

    const today = new Date().toISOString().slice(0, 10);
const sorted = [...competitions].sort((a, b) => a.date.localeCompare(b.date));

const pastByYear = useMemo(() => {
    const past = competitions.filter((c) => c.date < today);
    past.sort((a, b) => b.date.localeCompare(a.date));
    const map: Record<string, typeof past> = {};
    for (const c of past) {
        const yr = c.date.slice(0, 4);
        map[yr] ??= [];
        map[yr].push(c);
    }
    return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a));
}, [competitions]);

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">{t.comps_admin_eyebrow}</p>
                    <h1>{t.comps_admin_heading}</h1>
                    <p>{t.comps_admin_desc}</p>
                </div>
                <div className="comp-header-actions">
                    <button
                        className="secondary-action score-button"
                        type="button"
                        disabled={syncStatus === "loading"}
                        onClick={syncFromSvhkf}
                    >
                        <RefreshCw size={17} className={syncStatus === "loading" ? "spin" : ""} aria-hidden="true" />
                        {syncLabel}
                    </button>
                    <button
                        className="primary-action score-button"
                        type="button"
                        onClick={() => setShowForm((v) => !v)}
                    >
                        <Plus size={17} aria-hidden="true" />
                        {t.comps_add_btn}
                    </button>
                </div>
            </div>

            {showForm && (
                <section className="admin-panel">
                    <div className="panel-title-row">
                        <h2>{t.comps_new_heading}</h2>
                    </div>
                    <div className="comp-form-grid">
                        <label>
                            {t.comps_form_name}
                            <input
                                type="text"
                                placeholder={t.comps_form_name_ph}
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            />
                        </label>
                        <label>
                            {t.comps_form_date}
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                            />
                        </label>
                        <label>
                            {t.comps_form_org}
                            <input
                                type="text"
                                placeholder={t.comps_form_org_ph}
                                value={form.organizer}
                                onChange={(e) => setForm((f) => ({ ...f, organizer: e.target.value }))}
                            />
                        </label>
                        <label>
                            {t.comps_form_loc}
                            <input
                                type="text"
                                placeholder={t.comps_form_loc_ph}
                                value={form.location}
                                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                            />
                        </label>
                    </div>
                    <div className="comp-form-actions">
                        <button
                            className="secondary-action score-button"
                            type="button"
                            onClick={() => { setShowForm(false); setForm(emptyForm); }}
                        >
                            {t.comps_form_cancel}
                        </button>
                        <button
                            className="primary-action score-button"
                            type="button"
                            disabled={!form.name.trim() || !form.date}
                            onClick={handleAdd}
                        >
                            {t.comps_form_save}
                        </button>
                    </div>
                </section>
            )}

            {sorted.length === 0 ? (
                <section className="admin-panel">
                    <p>{t.comps_none}</p>
                </section>
            ) : (
                <div className="table-shell">
                    <table>
                        <thead>
                            <tr>
                                <th>{t.comps_col_name}</th>
                                <th>{t.comps_col_date}</th>
                                <th>{t.comps_col_org}</th>
                                <th>{t.comps_col_loc}</th>
                                <th>{t.comps_col_ranking}</th>
                                <th>{t.comps_col_reg}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((comp) => (
                                <tr key={comp.id}>
                                    <td>
                                        <strong>{comp.name}</strong>
                                        {comp.source === "svhkf" && <span className="comp-source-badge">svhkf.se</span>}
                                    </td>
                                    <td>
                                        <span className="comp-date">
                                            <CalendarDays size={14} aria-hidden="true" />
                                            {comp.date}
                                        </span>
                                    </td>
                                    <td>{comp.organizer || "–"}</td>
                                    <td>{comp.location || "–"}</td>
                                    <td>
                                        {comp.ranking
                                            ? <span className="success-pill">{t.comps_yes}</span>
                                            : <span className="comp-pill-closed comp-pill-btn">{t.comps_no}</span>}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={comp.registrationOpen ? "success-pill comp-pill-btn" : "comp-pill-btn comp-pill-closed"}
                                            onClick={() => toggleRegistration(comp.id)}
                                        >
                                            {comp.registrationOpen ? t.status_open : t.status_closed}
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="comp-delete-btn"
                                            aria-label={`${t.comps_delete} ${comp.name}`}
                                            onClick={() => handleDelete(comp.id)}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pastByYear.length > 0 && (
                <div className="past-comps-section">
                    {pastByYear.map(([year, comps]) => (
                        <div key={year}>
                            <h2 className="past-comps-year-heading">Tävlingar {year}</h2>
                            <div className="past-comps-grid">
                                {comps.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className="past-comp-card"
                                        onClick={() => openCompResults(c)}
                                        title="Visa resultat"
                                    >
                                        <div
                                            className="past-comp-logo"
                                            style={{ background: clubColor(c.organizer || c.name) }}
                                        >
                                            {clubInitials(c.organizer || c.name)}
                                        </div>
                                        <p className="past-comp-name">{c.name}</p>
                                        <div className="past-comp-meta">
                                            <span>{c.date}</span>
                                            {c.organizer && <span>{c.organizer}</span>}
                                            {c.location && <span>{c.location}</span>}
                                            {noResultsFor === c.id && (
                                                <span style={{ color: "var(--muted)", fontStyle: "italic" }}>Inga sparade resultat</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
