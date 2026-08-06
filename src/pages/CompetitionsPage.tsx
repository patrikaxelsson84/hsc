import { CalendarDays, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
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

const emptyForm = { name: "", date: "", organizer: "", location: "" };

export default function CompetitionsPage() {
    const { t } = useLanguage();
    const [competitions, setCompetitions] = useState<Competition[]>(loadCompetitions);
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

    const sorted = [...competitions].sort((a, b) => a.date.localeCompare(b.date));

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
        </div>
    );
}
