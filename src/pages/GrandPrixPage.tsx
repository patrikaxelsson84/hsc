import { ArrowLeft, ChevronDown, Trophy, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGpResults, type GpResultRow } from "../lib/gpResults";
import { rankPlayers } from "../lib/scoring";
import type { ClassLevel, PlayerScore } from "../lib/scoring";
import LangSelect from "../components/LangSelect";
import { useLanguage } from "../lib/language";

// ── GP computation ──────────────────────────────────────────────────────────

const GP_PTS = [15, 13, 11, 9, 7, 6, 5, 4, 3, 2]; // rank 1–10; rank 11+ = 1

const INDIVIDUAL = new Set(["mr", "mrs", "junior", "minions", "individual-rank"]);

const CLASS_ZONES = {
    1: { promo: 0, relego: 3 },
    2: { promo: 3, relego: 5 },
    3: { promo: 5, relego: 5 },
    4: { promo: 5, relego: 0 },
} as const;

function ptsForRank(rank: number, n: number): number {
    const scorers = Math.floor(n * 0.8);
    if (rank > scorers) return 0;
    return GP_PTS[rank - 1] ?? 1;
}

interface PlayerGp {
    name: string;
    club: string;
    classLevel: ClassLevel;
    total: number;
    eventPts: Record<string, number>;
    eventCount: number;
}

function isIndividual(runId: string): boolean {
    const ids = runId.split("__")[1]?.split("+") ?? [];
    return ids.some((id) => INDIVIDUAL.has(id));
}

function computeStandings(rows: GpResultRow[]): Map<ClassLevel, PlayerGp[]> {
    const pm = new Map<string, PlayerGp>();

    for (const row of rows) {
        if (!isIndividual(row.run_id)) continue;

        const byClass = new Map<number, PlayerScore[]>();
        for (const p of row.players) {
            byClass.set(p.classLevel, [...(byClass.get(p.classLevel) ?? []), p]);
        }

        for (const [cls, players] of byClass) {
            const hasPrecomputed = players.some((p) => (p as any).gpPoints !== undefined);
            if (hasPrecomputed) {
                for (const p of players) {
                    const pts = ((p as any).gpPoints as number) ?? 0;
                    const key = `${p.name}|||${p.club}`;
                    if (!pm.has(key)) {
                        pm.set(key, { name: p.name, club: p.club, classLevel: cls as ClassLevel, total: 0, eventPts: {}, eventCount: 0 });
                    }
                    const e = pm.get(key)!;
                    e.classLevel = cls as ClassLevel;
                    e.eventPts[row.run_id] = Math.max(e.eventPts[row.run_id] ?? 0, pts);
                }
            } else {
                const ranked = rankPlayers(players);
                for (const rp of ranked) {
                    const pts = ptsForRank(rp.rank, players.length);
                    const key = `${rp.name}|||${rp.club}`;
                    if (!pm.has(key)) {
                        pm.set(key, { name: rp.name, club: rp.club, classLevel: cls as ClassLevel, total: 0, eventPts: {}, eventCount: 0 });
                    }
                    const e = pm.get(key)!;
                    e.classLevel = cls as ClassLevel;
                    e.eventPts[row.run_id] = Math.max(e.eventPts[row.run_id] ?? 0, pts);
                }
            }
        }
    }

    for (const e of pm.values()) {
        const all = Object.values(e.eventPts).sort((a, b) => b - a);
        e.eventCount = all.length;
        e.total = all.slice(0, 12).reduce((s, p) => s + p, 0);
    }

    const result = new Map<ClassLevel, PlayerGp[]>();
    for (const e of pm.values()) {
        result.set(e.classLevel, [...(result.get(e.classLevel) ?? []), e]);
    }
    for (const [cls, players] of result) {
        result.set(cls, players.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)));
    }
    return result;
}

function evtAbbr(row: GpResultRow): string {
    const first = row.competition_name.split(/\s+/)[0] ?? "";
    return first.slice(0, 3).toUpperCase();
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function GrandPrixPage() {
    const { t, lang } = useLanguage();
    const [rows,        setRows]        = useState<GpResultRow[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [activeClass, setActiveClass] = useState<ClassLevel>(1);
    const [rulesOpen,   setRulesOpen]   = useState(false);

    useEffect(() => {
        fetchGpResults().then((r) => { setRows(r); setLoading(false); });
    }, []);

    const standings = useMemo(() => computeStandings(rows), [rows]);
    const events    = useMemo(() => rows.filter((r) => isIndividual(r.run_id)), [rows]);
    const players   = standings.get(activeClass) ?? [];
    const zones     = CLASS_ZONES[activeClass];

    const CLASSES: ClassLevel[] = [1, 2, 3, 4];

    return (
        <main className="public-page">
            <header className="site-header">
                <div className="header-left">
                    <Link className="brand" to="/" aria-label="HSC home">
                        <span className="brand-mark">HSC</span>
                        <span>{t.brand_subtitle}</span>
                    </Link>
                </div>
                <LangSelect />
            </header>

            <div className="gp-shell">

                <div className="gp-intro">
                    <Link className="back-link" to="/">
                        <ArrowLeft size={15} aria-hidden="true" />
                        {lang === "sv" ? "Hem" : "Home"}
                    </Link>
                    <p className="eyebrow">Sweden Grand Prix</p>
                    <h1 className="gp-title">
                        {lang === "sv" ? "Säsongsranking 2026/2027" : "Season Standings 2026/2027"}
                    </h1>
                    <p className="gp-intro-desc">
                        {lang === "sv"
                            ? "GP-poäng per klass. Bästa 12 tävlingsresultat räknas per spelare."
                            : "GP points by class. Best 12 competition results count per player."}
                    </p>
                </div>

                {/* Class tabs */}
                <div className="gp-tabs" role="tablist" aria-label={lang === "sv" ? "Välj klass" : "Select class"}>
                    {CLASSES.map((cls) => {
                        const count = standings.get(cls)?.length ?? 0;
                        return (
                            <button
                                key={cls}
                                role="tab"
                                type="button"
                                aria-selected={activeClass === cls}
                                className={activeClass === cls ? "gp-tab active" : "gp-tab"}
                                onClick={() => setActiveClass(cls)}
                            >
                                {lang === "sv" ? `Klass ${cls}` : `Class ${cls}`}
                                {count > 0 && <span className="gp-tab-badge">{count}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Zone legend */}
                {players.length > 0 && (
                    <div className="gp-legend">
                        {zones.promo > 0 && (
                            <span className="gp-legend-pill promo">
                                <TrendingUp size={12} aria-hidden="true" />
                                {lang === "sv"
                                    ? `Topp ${zones.promo} — uppflyttning`
                                    : `Top ${zones.promo} — promoted`}
                            </span>
                        )}
                        {zones.relego > 0 && (
                            <span className="gp-legend-pill relego">
                                <TrendingDown size={12} aria-hidden="true" />
                                {lang === "sv"
                                    ? `Botten ${zones.relego} — nedflyttning`
                                    : `Bottom ${zones.relego} — relegated`}
                            </span>
                        )}
                    </div>
                )}

                {/* Standings */}
                <div role="tabpanel">
                    {loading ? (
                        <div className="gp-empty-state">
                            <p>{lang === "sv" ? "Laddar…" : "Loading…"}</p>
                        </div>
                    ) : players.length === 0 ? (
                        <div className="gp-empty-state">
                            <Trophy size={44} className="gp-empty-icon" aria-hidden="true" />
                            <p>
                                {lang === "sv"
                                    ? "Inga resultat ännu. Poäng visas här när admin sparar tävlingsresultat."
                                    : "No results yet — scores appear here when the admin saves competition results."}
                            </p>
                        </div>
                    ) : (
                        <div className="gp-table-wrap">
                            <table className="gp-table">
                                <thead>
                                    <tr>
                                        <th className="gp-th-rank">#</th>
                                        <th className="gp-th-name">{lang === "sv" ? "Namn" : "Name"}</th>
                                        <th className="gp-th-club">{lang === "sv" ? "Klubb" : "Club"}</th>
                                        {events.map((ev) => (
                                            <th
                                                key={ev.run_id}
                                                className="gp-th-evt"
                                                title={`${ev.competition_name}${ev.competition_date ? " · " + ev.competition_date : ""}`}
                                            >
                                                <span>{evtAbbr(ev)}</span>
                                            </th>
                                        ))}
                                        <th className="gp-th-total">{lang === "sv" ? "Poäng" : "Points"}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((p, idx) => {
                                        const rank     = idx + 1;
                                        const isPromo  = zones.promo  > 0 && rank <= zones.promo;
                                        const isRelego = zones.relego > 0 && rank > players.length - zones.relego;
                                        const rowCls   = isPromo ? "gp-row-promo" : isRelego ? "gp-row-relego" : "";
                                        return (
                                            <tr key={`${p.name}|||${p.club}`} className={rowCls}>
                                                <td className="gp-td-rank">
                                                    <span>{rank}</span>
                                                    {isPromo  && <TrendingUp   size={11} className="gp-zone-arrow promo"  aria-hidden="true" />}
                                                    {isRelego && <TrendingDown  size={11} className="gp-zone-arrow relego" aria-hidden="true" />}
                                                </td>
                                                <td className="gp-td-name"><strong>{p.name}</strong></td>
                                                <td className="gp-td-club">{p.club || "–"}</td>
                                                {events.map((ev) => {
                                                    const pts = p.eventPts[ev.run_id];
                                                    const cls = pts === undefined
                                                        ? "gp-td-evt absent"
                                                        : pts === 0 ? "gp-td-evt zero" : "gp-td-evt scored";
                                                    return (
                                                        <td key={ev.run_id} className={cls}>
                                                            {pts === undefined ? "" : pts === 0 ? "–" : pts}
                                                        </td>
                                                    );
                                                })}
                                                <td className="gp-td-total">
                                                    <strong>{p.total}</strong>
                                                    {p.eventCount > 12 && (
                                                        <span className="gp-overflow-badge">{p.eventCount}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Rules accordion */}
                <div className="gp-rules">
                    <button
                        className="gp-rules-toggle"
                        type="button"
                        aria-expanded={rulesOpen}
                        onClick={() => setRulesOpen((v) => !v)}
                    >
                        <span>{lang === "sv" ? "Regler & poängfördelning" : "Rules & point distribution"}</span>
                        <ChevronDown size={16} className={rulesOpen ? "gp-chevron open" : "gp-chevron"} aria-hidden="true" />
                    </button>

                    {rulesOpen && (
                        <div className="gp-rules-body">
                            <div className="gp-rules-grid">
                                <div className="gp-rules-card">
                                    <h3>{lang === "sv" ? "Klassstruktur" : "Class structure"}</h3>
                                    <table className="gp-mini-table">
                                        <thead>
                                            <tr>
                                                <th>{lang === "sv" ? "Klass" : "Class"}</th>
                                                <th>{lang === "sv" ? "Platser" : "Size"}</th>
                                                <th>↑ {lang === "sv" ? "upp" : "up"}</th>
                                                <th>↓ {lang === "sv" ? "ned" : "down"}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>Klass 1</td><td>15</td><td>–</td><td>3</td></tr>
                                            <tr><td>Klass 2</td><td>20</td><td>3</td><td>5</td></tr>
                                            <tr><td>Klass 3</td><td>40</td><td>5</td><td>5</td></tr>
                                            <tr><td>Klass 4</td><td>–</td><td>5</td><td>–</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="gp-rules-card">
                                    <h3>{lang === "sv" ? "Poängfördelning" : "Points per place"}</h3>
                                    <div className="gp-pts-grid">
                                        {[15, 13, 11, 9, 7, 6, 5, 4, 3, 2].map((pts, i) => (
                                            <span key={i} className="gp-pts-row">
                                                <span className="gp-pts-rank">{i + 1}</span>
                                                <span className="gp-pts-val">{pts}</span>
                                            </span>
                                        ))}
                                        <span className="gp-pts-row">
                                            <span className="gp-pts-rank">11+</span>
                                            <span className="gp-pts-val">1</span>
                                        </span>
                                    </div>
                                    <p className="gp-rules-note">
                                        {lang === "sv"
                                            ? "Ca 80% av deltagarna per klass poängsätts vid varje tävling. Bästa 12 resultat räknas."
                                            : "~80% of class participants score points at each event. Best 12 results count."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <footer className="site-footer">
                <div className="site-footer-inner">
                    <span className="site-footer-copy">
                        © {new Date().getFullYear()} hscontest.se. All rights reserved.
                    </span>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <Link className="site-footer-link" to="/privacy">{t.footer_privacy}</Link>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <Link className="site-footer-link" to="/club-apply">{t.apply_link}</Link>
                    <span className="site-footer-pipe" aria-hidden="true">|</span>
                    <span className="site-footer-dev">Designed and developed by Patrik Axelsson.</span>
                </div>
            </footer>
        </main>
    );
}
