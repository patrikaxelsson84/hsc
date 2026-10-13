import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/language";
import { calculateBonusPoints } from "../lib/scoring";
import type { PlayerScore } from "../lib/scoring";

interface CompEntry { contestName: string; completedAt: string; }

interface PlayerBonusRow {
    name: string;
    club: string;
    total: number;
    perComp: Record<string, number>;
}

export default function BonusjaktenPage() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [competitions, setCompetitions] = useState<CompEntry[]>([]);
    const [rows, setRows] = useState<PlayerBonusRow[]>([]);

    useEffect(() => {
        supabase
            .from("contest_results")
            .select("contest_name, completed_at, players")
            .order("completed_at", { ascending: true })
            .then(({ data }) => {
                if (!data) { setLoading(false); return; }

                // One column per contest_name (keep earliest occurrence for ordering)
                const compOrder = new Map<string, string>();
                for (const row of data) {
                    if (!compOrder.has(row.contest_name)) {
                        compOrder.set(row.contest_name, row.completed_at);
                    }
                }
                const comps = [...compOrder.entries()]
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([contestName, completedAt]) => ({ contestName, completedAt }));
                setCompetitions(comps);

                // Aggregate bonus points per player × competition
                const playerMap = new Map<string, PlayerBonusRow>();
                for (const row of data) {
                    const players = row.players as PlayerScore[];
                    for (const p of players) {
                        const bp = calculateBonusPoints(p.bonusHits ?? []);
                        if (bp === 0) continue;
                        const key = `${p.name}|${p.club}`;
                        const entry = playerMap.get(key) ?? { name: p.name, club: p.club, total: 0, perComp: {} };
                        entry.perComp[row.contest_name] = (entry.perComp[row.contest_name] ?? 0) + bp;
                        entry.total = Object.values(entry.perComp).reduce((s, v) => s + v, 0);
                        playerMap.set(key, entry);
                    }
                }

                const sorted = [...playerMap.values()]
                    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
                setRows(sorted);
                setLoading(false);
            });
    }, []);

    let rank = 0;
    let prevTotal = -1;

    return (
        <div className="public-page bonusjakten-page">
            <nav className="guestbook-nav">
                <Link to="/" className="guestbook-back">
                    <ArrowLeft size={16} /> {t.bonus_back}
                </Link>
            </nav>

            <header className="guestbook-header">
                <span className="guestbook-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                    <Star size={28} />
                </span>
                <div>
                    <p className="eyebrow">{t.bonus_eyebrow}</p>
                    <h1>{t.bonus_heading}</h1>
                    <p className="guestbook-subtitle">{t.bonus_subtitle}</p>
                </div>
            </header>

            {loading ? (
                <p className="bonus-empty">{t.bonus_loading}</p>
            ) : rows.length === 0 ? (
                <p className="bonus-empty">{t.bonus_empty}</p>
            ) : (
                <section className="bonus-table-wrap">
                    <div className="bonus-table-scroll">
                        <table className="bonus-table">
                            <thead>
                                <tr>
                                    <th className="bonus-th bonus-th-rank">{t.bonus_col_rank}</th>
                                    <th className="bonus-th bonus-th-name">{t.bonus_col_name}</th>
                                    <th className="bonus-th bonus-th-club">{t.bonus_col_club}</th>
                                    <th className="bonus-th bonus-th-total">{t.bonus_col_total}</th>
                                    {competitions.map((c) => (
                                        <th key={c.contestName} className="bonus-th bonus-th-comp">{c.contestName}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    if (row.total !== prevTotal) { rank++; prevTotal = row.total; }
                                    return (
                                        <tr key={`${row.name}|${row.club}`}>
                                            <td className="bonus-td bonus-td-rank">{rank}</td>
                                            <td className="bonus-td bonus-td-name">{row.name}</td>
                                            <td className="bonus-td bonus-td-club">{row.club}</td>
                                            <td className="bonus-td bonus-td-total">{row.total}</td>
                                            {competitions.map((c) => (
                                                <td key={c.contestName} className="bonus-td bonus-td-comp">
                                                    {row.perComp[c.contestName] ?? ""}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
