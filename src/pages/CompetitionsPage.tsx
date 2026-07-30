import { CalendarDays, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

const storageKey = "hsc-competitions-v1";

interface Competition {
    id: string;
    name: string;
    date: string;
    organizer: string;
    location: string;
    ranking: boolean;
    registrationOpen: boolean;
    source: "manual" | "svhkf";
}

// Seed data fetched from svhkf.se/kalender – used only when localStorage is empty
const seedCompetitions: Omit<Competition, "id" | "registrationOpen">[] = [
    { name: "Tingsryd Open", date: "2026-05-16", organizer: "Tingsryd Hsc", location: "Lilltorp Arena", ranking: true, source: "svhkf" },
    { name: "Smålandsmästaren ute", date: "2026-05-16", organizer: "Tingsryd Hsc", location: "Kurorten", ranking: true, source: "svhkf" },
    { name: "Björkenäs Open", date: "2026-05-30", organizer: "Lanternan", location: "Björkenäs camping", ranking: true, source: "svhkf" },
    { name: "Jämjö Open", date: "2026-05-31", organizer: "Jämjö Hsk", location: "Björkenäs camping", ranking: true, source: "svhkf" },
    { name: "Sweden Masters", date: "2026-06-12", organizer: "SvHKF", location: "Hovmantorp", ranking: false, source: "svhkf" },
    { name: "Inoff SM utomhus", date: "2026-06-13", organizer: "Växjö", location: "Gökaskratts Camping", ranking: true, source: "svhkf" },
    { name: "SibbamålaMästerskapet", date: "2026-06-27", organizer: "Sibbamåla If", location: "Sibbamåla hembygdspark", ranking: false, source: "svhkf" },
    { name: "Blekinge DM ute", date: "2026-08-01", organizer: "Lanternan Hsk", location: "Björkenäs Camping", ranking: true, source: "svhkf" },
    { name: "Lilltorp Open", date: "2026-08-08", organizer: "Balders Hsk", location: "Lilltorp Arena, Rådmansö", ranking: true, source: "svhkf" },
    { name: "Roslagen Open", date: "2026-08-09", organizer: "Viby Hsk", location: "Lilltorp Arena, Rådmansö", ranking: true, source: "svhkf" },
    { name: "Wezet Open", date: "2026-08-15", organizer: "Wezet Hsk", location: "Vislanda", ranking: true, source: "svhkf" },
    { name: "Dynapac Open", date: "2026-08-29", organizer: "Dynapac Hsk", location: "Dragsö Camping", ranking: true, source: "svhkf" },
    { name: "Viby Open", date: "2026-09-12", organizer: "Viby Hsk", location: "4H Bögs gård", ranking: true, source: "svhkf" },
    { name: "Svealand DM ute", date: "2026-09-12", organizer: "Viby Hsk", location: "4H Bögs gård", ranking: true, source: "svhkf" },
    { name: "Växjö Open", date: "2026-09-19", organizer: "Växjö Hsk", location: "Växjö boulehall", ranking: true, source: "svhkf" },
    { name: "Höstskon", date: "2026-10-03", organizer: "Korpen Nybro", location: "Korpcentrum, Nybro", ranking: true, source: "svhkf" },
    { name: "Carlskrona Cup", date: "2026-10-17", organizer: "Carlskrona Hsc", location: "Rosenholm Boulearena", ranking: true, source: "svhkf" },
    { name: "Sibbamåla Open", date: "2026-11-14", organizer: "Sibbamåla If", location: "Rosenholm Boulearena", ranking: true, source: "svhkf" },
    { name: "Värendspokalen", date: "2027-04-10", organizer: "Värends Hsk", location: "Växjö boulehall", ranking: true, source: "svhkf" },
    { name: "Inoff SM inomhus", date: "2027-04-24", organizer: "Dyna X", location: "Rosenholm", ranking: true, source: "svhkf" },
];

function loadCompetitions(): Competition[] {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw);
    } catch { /* empty */ }
    const seeded = seedCompetitions.map((c, i) => ({ ...c, id: `svhkf-${i}`, registrationOpen: true }));
    localStorage.setItem(storageKey, JSON.stringify(seeded));
    return seeded;
}

function saveCompetitions(list: Competition[]) {
    localStorage.setItem(storageKey, JSON.stringify(list));
}

function parseSvhkfDate(raw: string): string {
    // Handles "16/5 2026", "13-14/6 2026", "2027"
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
        const dateRaw = cells[0]?.textContent?.trim() ?? "";
        const name = cells[1]?.textContent?.trim() ?? "";
        const organizer = cells[2]?.textContent?.trim() ?? "";
        const location = cells[3]?.textContent?.trim() ?? "";
        const rankingText = cells[4]?.textContent?.trim() ?? "";
        if (!name || !dateRaw) return;
        const date = parseSvhkfDate(dateRaw);
        if (!date) return;
        results.push({
            name,
            date,
            organizer,
            location,
            ranking: rankingText.toLowerCase().startsWith("ja"),
            source: "svhkf",
        });
    });

    return results;
}

const emptyForm = { name: "", date: "", organizer: "", location: "" };

export default function CompetitionsPage() {
    const [competitions, setCompetitions] = useState<Competition[]>(loadCompetitions);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

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
                        // Update date/organizer/location if changed
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

    const sorted = [...competitions].sort((a, b) => a.date.localeCompare(b.date));

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">Competitions</p>
                    <h1>Competition list</h1>
                    <p>Synced from svhkf.se/kalender — add manual entries below.</p>
                </div>
                <div className="comp-header-actions">
                    <button
                        className="secondary-action score-button"
                        type="button"
                        disabled={syncStatus === "loading"}
                        onClick={syncFromSvhkf}
                    >
                        <RefreshCw size={17} className={syncStatus === "loading" ? "spin" : ""} aria-hidden="true" />
                        {syncStatus === "loading" ? "Syncing…" : syncStatus === "done" ? "Synced!" : syncStatus === "error" ? "Sync failed" : "Sync from svhkf.se"}
                    </button>
                    <button
                        className="primary-action score-button"
                        type="button"
                        onClick={() => setShowForm((v) => !v)}
                    >
                        <Plus size={17} aria-hidden="true" />
                        Add competition
                    </button>
                </div>
            </div>

            {showForm && (
                <section className="admin-panel">
                    <div className="panel-title-row">
                        <h2>New competition</h2>
                    </div>
                    <div className="comp-form-grid">
                        <label>
                            Name
                            <input
                                type="text"
                                placeholder="Competition name"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            />
                        </label>
                        <label>
                            Date
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                            />
                        </label>
                        <label>
                            Organizer
                            <input
                                type="text"
                                placeholder="Club name"
                                value={form.organizer}
                                onChange={(e) => setForm((f) => ({ ...f, organizer: e.target.value }))}
                            />
                        </label>
                        <label>
                            Location
                            <input
                                type="text"
                                placeholder="Venue"
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
                            Cancel
                        </button>
                        <button
                            className="primary-action score-button"
                            type="button"
                            disabled={!form.name.trim() || !form.date}
                            onClick={handleAdd}
                        >
                            Save
                        </button>
                    </div>
                </section>
            )}

            {sorted.length === 0 ? (
                <section className="admin-panel">
                    <p>No competitions yet. Click "Sync from svhkf.se" or add one manually.</p>
                </section>
            ) : (
                <div className="table-shell">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Date</th>
                                <th>Organizer</th>
                                <th>Location</th>
                                <th>Ranking</th>
                                <th>Registration</th>
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
                                    <td>{comp.ranking ? <span className="success-pill">Yes</span> : <span className="comp-pill-closed comp-pill-btn">No</span>}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={comp.registrationOpen ? "success-pill comp-pill-btn" : "comp-pill-btn comp-pill-closed"}
                                            onClick={() => toggleRegistration(comp.id)}
                                        >
                                            {comp.registrationOpen ? "Open" : "Closed"}
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="comp-delete-btn"
                                            aria-label={`Delete ${comp.name}`}
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
