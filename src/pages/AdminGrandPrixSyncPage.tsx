import { CheckCircle2, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const EDGE_URL  = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/fetch-gp-svhkf`;

interface SvhkfPlayer {
    place:      number;
    name:       string;
    club:       string;
    gpPoints:   number;
    classLevel: number;
}

function cls(n: number) { return `Klass ${n}`; }

export default function AdminGrandPrixSyncPage() {
    const [status,  setStatus]  = useState<"idle" | "fetching" | "preview" | "saving" | "done" | "error">("idle");
    const [season,  setSeason]  = useState("");
    const [players, setPlayers] = useState<SvhkfPlayer[]>([]);
    const [error,   setError]   = useState("");

    async function handleFetch() {
        setStatus("fetching");
        setError("");
        try {
            const resp = await fetch(EDGE_URL, {
                method:  "POST",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `Bearer ${ANON_KEY}`,
                },
                body: JSON.stringify({}),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data.error) throw new Error(data.error);
            setSeason(data.season ?? "");
            setPlayers(data.players ?? []);
            setStatus("preview");
        } catch (e) {
            setError(String(e));
            setStatus("error");
        }
    }

    async function handleImport() {
        setStatus("saving");
        // Build one gp_results row with all players (pre-seeded gpPoints per class)
        const seasonSlug = season.replace("/", "");
        const runId = `svhkf_import_${seasonSlug}__individual-rank`;

        const gpPlayers = players.map((p) => ({
            id:         crypto.randomUUID(),
            name:       p.name,
            club:       p.club,
            classLevel: p.classLevel,
            scores:     [] as number[][],
            gpPoints:   p.gpPoints,
        }));

        const { error: dbErr } = await supabase.from("gp_results").upsert({
            run_id:           runId,
            competition_name: `SVHKF Import ${season}`,
            competition_date: new Date().toISOString().slice(0, 10),
            type_name:        "individual-rank",
            players:          gpPlayers,
            is_sm:            false,
            saved_at:         new Date().toISOString(),
        }, { onConflict: "run_id" });

        if (dbErr) { setError(dbErr.message); setStatus("error"); return; }
        setStatus("done");
    }

    const byClass = [1, 2, 3, 4].map((n) => ({
        n,
        rows: players.filter((p) => p.classLevel === n).sort((a, b) => a.place - b.place),
    }));

    return (
        <div className="admin-section">
            <div className="admin-section-header">
                <span className="admin-section-icon"><Download size={20} /></span>
                <h2>Synka GP från SVHKF</h2>
            </div>

            <p className="gp-sync-info">
                Hämtar aktuell säsongs GP-ställning från svhkf.se och importerar den som ett historikunderlag i Grand Prix-tabellen.
                Kan göras om vid behov — befintlig import för samma säsong skrivs över.
            </p>

            {status === "idle" || status === "error" ? (
                <button className="primary-action gp-sync-btn" onClick={handleFetch}>
                    <RefreshCw size={16} /> Hämta från svhkf.se
                </button>
            ) : status === "fetching" ? (
                <button className="primary-action gp-sync-btn" disabled>
                    <RefreshCw size={16} className="spinning" /> Hämtar…
                </button>
            ) : null}

            {error && <p className="gp-sync-error">{error}</p>}

            {status === "preview" && (
                <>
                    <p className="gp-sync-season">Säsong: <strong>{season}</strong> · {players.length} spelare totalt</p>
                    {byClass.map(({ n, rows }) => rows.length === 0 ? null : (
                        <div key={n} className="gp-sync-class">
                            <h3 className="gp-sync-class-title">{cls(n)} — {rows.length} spelare</h3>
                            <table className="gp-sync-table">
                                <thead>
                                    <tr><th>#</th><th>Namn</th><th>Klubb</th><th>GP-poäng</th></tr>
                                </thead>
                                <tbody>
                                    {rows.map((p) => (
                                        <tr key={`${p.name}${p.club}`}>
                                            <td>{p.place}</td>
                                            <td>{p.name}</td>
                                            <td>{p.club}</td>
                                            <td><strong>{p.gpPoints}</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                    <div className="gp-sync-actions">
                        <button className="primary-action gp-sync-btn" onClick={handleImport}>
                            <Download size={16} /> Importera till Grand Prix
                        </button>
                        <button className="secondary-btn" onClick={() => { setStatus("idle"); setPlayers([]); }}>
                            Avbryt
                        </button>
                    </div>
                </>
            )}

            {status === "saving" && (
                <p className="gp-sync-saving"><RefreshCw size={14} className="spinning" /> Sparar…</p>
            )}

            {status === "done" && (
                <div className="gp-sync-done">
                    <CheckCircle2 size={20} />
                    <div>
                        <strong>Import klar!</strong>
                        <p>{players.length} spelare ({season}) sparade. Grand Prix-tabellen på startsidan är nu uppdaterad.</p>
                    </div>
                    <button className="secondary-btn" onClick={() => { setStatus("idle"); setPlayers([]); setSeason(""); }}>
                        Synka igen
                    </button>
                </div>
            )}
        </div>
    );
}
