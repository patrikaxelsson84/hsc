import { GripVertical, Maximize, Minimize, Printer, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import type { ClassLevel, PlayerScore, TeamAssignment, TeamResult } from "../lib/scoring";
import { rankPlayers, rankTeams } from "../lib/scoring";
import { useLanguage } from "../lib/language";

const liveScorePrefix    = "hsc-live-v1";
const teamsStoragePrefix = "hsc-teams-v1";
const activeContestKey   = "hsc-active-v1";

export const RESULTS_ORDER_KEY = "hsc-results-order-v1";
export type SectionKey = "mixed-pairs" | "class-1" | "class-2" | "class-3" | "class-4" | "herr" | "dam" | "junior" | "minior" | "teams";
const DEFAULT_ORDER: SectionKey[] = ["mixed-pairs", "class-1", "class-2", "class-3", "class-4", "herr", "dam", "junior", "minior", "teams"];

const REGISTRATIONS_KEY = "hsc-registrations";

interface PairResult {
    id: string;
    mrName: string;
    mrsName: string;
    rounds: number[];
    total: number;
    rank: number;
}

function buildMixedPairs(players: PlayerScore[], competitionId: string): PairResult[] {
    try {
        const regs: { firstName: string; lastName: string; category: string; pairWith?: string; competitionId?: string }[] =
            JSON.parse(localStorage.getItem(REGISTRATIONS_KEY) ?? "[]");
        const pairs = regs.filter((r) => r.competitionId === competitionId && r.category === "mix-d" && r.pairWith);

        const seen = new Set<string>();
        const results: PairResult[] = [];

        for (const entry of pairs) {
            const nameA = `${entry.firstName} ${entry.lastName}`.trim();
            const nameB = entry.pairWith!;
            const key = [nameA, nameB].sort().join("|");
            if (seen.has(key)) continue;
            seen.add(key);

            const pA = players.find((p) => p.name === nameA);
            const pB = players.find((p) => p.name === nameB);
            if (!pA || !pB) continue;

            const isMrA = pA.ageCategory === "herr";
            const mr  = isMrA ? pA : pB;
            const mrs = isMrA ? pB : pA;

            const rounds = Array.from({ length: 10 }, (_, i) => (mr.rounds[i] ?? 0) + (mrs.rounds[i] ?? 0));
            results.push({ id: key, mrName: mr.name, mrsName: mrs.name, rounds, total: rounds.reduce((a, b) => a + b, 0), rank: 0 });
        }

        results.sort((a, b) => b.total - a.total);
        results.forEach((r, i) => { r.rank = i + 1; });
        return results;
    } catch {
        return [];
    }
}

export function loadResultsOrder(): SectionKey[] {
    try {
        const raw = localStorage.getItem(RESULTS_ORDER_KEY);
        if (raw) return JSON.parse(raw) as SectionKey[];
    } catch {}
    return [...DEFAULT_ORDER];
}

export function saveResultsOrder(order: SectionKey[]) {
    localStorage.setItem(RESULTS_ORDER_KEY, JSON.stringify(order));
}

type ActiveContest = { runId: string; contestName: string; typeName: string };

function readLiveData(): { active: ActiveContest; players: PlayerScore[]; teamAssignments: TeamAssignment[] } | null {
    try {
        const raw = localStorage.getItem(activeContestKey);
        if (!raw) return null;
        const active = JSON.parse(raw) as ActiveContest;
        const playersRaw = localStorage.getItem(`${liveScorePrefix}-${active.runId}`);
        if (!playersRaw) return null;
        const teamsRaw = localStorage.getItem(`${teamsStoragePrefix}-${active.runId}`);
        const teamAssignments: TeamAssignment[] = teamsRaw ? JSON.parse(teamsRaw) : [];
        return { active, players: JSON.parse(playersRaw) as PlayerScore[], teamAssignments };
    } catch {
        return null;
    }
}

function RankingTable({ players, showClass = false }: { players: PlayerScore[]; showClass?: boolean }) {
    const { t } = useLanguage();
    const rankings = rankPlayers(players);

    if (rankings.length === 0) return <p className="results-empty-cat">{t.results_empty_heading}</p>;

    // A round is "played" if at least one player has a non-zero score for it
    const playedRounds = new Set(
        players.flatMap((p) => p.rounds.map((s, i) => s !== 0 ? i : -1).filter((i) => i >= 0))
    );
    const cell = (score: number, idx: number) => playedRounds.has(idx) ? score : "";

    return (
        <div className="results-class-table">
            <table>
                <thead>
                    <tr>
                        <th>{t.results_col_num}</th>
                        <th>{t.results_col_player}</th>
                        <th>{t.results_col_club}</th>
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
                    {rankings.map((player) => (
                        <tr key={player.id} className={player.rank <= 3 ? "top-rank" : undefined}>
                            <td className="rank-cell">{player.rank}</td>
                            <td><strong>{player.name}</strong></td>
                            <td>{player.club || "–"}</td>
                            {showClass && <td>{player.classLevel}</td>}
                            {player.rounds.slice(0, 5).map((r, i) => <td key={i}>{cell(r, i)}</td>)}
                            <td className="results-subtotal">{player.firstHalf}</td>
                            {player.rounds.slice(5, 10).map((r, i) => <td key={i}>{cell(r, i + 5)}</td>)}
                            <td className="results-subtotal">{player.secondHalf}</td>
                            <td className="results-subtotal"><strong>{player.total}</strong></td>
                            <td className="results-subtotal">{player.rankingPoints}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ClassResultBox({ classLevel, players, handle }: {
    classLevel: ClassLevel; players: PlayerScore[]; handle: React.ReactNode;
}) {
    const { t } = useLanguage();
    return (
        <section className="results-class-box">
            <div className="results-class-header">
                {handle}
                <h2>{t.results_class_prefix} {classLevel}</h2>
            </div>
            <RankingTable players={players} />
        </section>
    );
}

function CategoryResultBox({ title, players, showClass, handle }: {
    title: string; players: PlayerScore[]; showClass?: boolean; handle: React.ReactNode;
}) {
    return (
        <section className="results-class-box">
            <div className="results-class-header">
                {handle}
                <h2>{title}</h2>
            </div>
            <RankingTable players={players} showClass={showClass} />
        </section>
    );
}

function TeamResultBox({ teams, handle }: { teams: TeamResult[]; handle: React.ReactNode }) {
    const { t } = useLanguage();
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
                            <th>{t.results_col_num}</th>
                            <th>{t.results_col_teams_name}</th>
                            <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
                            <th className="results-subtotal">1–5</th>
                            <th>6</th><th>7</th><th>8</th><th>9</th><th>10</th>
                            <th className="results-subtotal">6–10</th>
                            <th className="results-subtotal">{t.results_col_total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const allPlayers = teams.flatMap((t) => t.players);
                            const playedRounds = new Set(
                                allPlayers.flatMap((p) => p.rounds.map((s, i) => s !== 0 ? i : -1).filter((i) => i >= 0))
                            );
                            const cell = (score: number, idx: number) => playedRounds.has(idx) ? score : "";
                            return teams.map((team) => {
                                const rounds = Array.from({ length: 10 }, (_, i) =>
                                    team.players.reduce((s, p) => s + (p.rounds[i] ?? 0), 0)
                                );
                                const firstHalf  = rounds.slice(0, 5).reduce((a, b) => a + b, 0);
                                const secondHalf = rounds.slice(5, 10).reduce((a, b) => a + b, 0);
                                return (
                                    <tr key={team.id} className={team.rank <= 3 ? "top-rank" : undefined}>
                                        <td className="rank-cell">{team.rank}</td>
                                        <td><strong>{team.name}</strong></td>
                                        {rounds.slice(0, 5).map((r, i) => <td key={i}>{cell(r, i)}</td>)}
                                        <td className="results-subtotal">{playedRounds.size > 0 ? firstHalf : ""}</td>
                                        {rounds.slice(5, 10).map((r, i) => <td key={i}>{cell(r, i + 5)}</td>)}
                                        <td className="results-subtotal">{playedRounds.size > 0 ? secondHalf : ""}</td>
                                        <td className="results-subtotal"><strong>{playedRounds.size > 0 ? team.total : ""}</strong></td>
                                    </tr>
                                );
                            });
                        })()}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function MixedPairsBox({ pairs, handle }: { pairs: PairResult[]; handle: React.ReactNode }) {
    const playedRounds = new Set(
        pairs.flatMap((p) => p.rounds.map((s, i) => s !== 0 ? i : -1).filter((i) => i >= 0))
    );
    const cell = (score: number, idx: number) => playedRounds.has(idx) ? score : "";

    return (
        <section className="results-class-box">
            <div className="results-class-header">
                {handle}
                <h2>Mixed</h2>
            </div>
            <div className="results-class-table">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Mr.</th>
                            <th>Mrs.</th>
                            <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
                            <th className="results-subtotal">1–5</th>
                            <th>6</th><th>7</th><th>8</th><th>9</th><th>10</th>
                            <th className="results-subtotal">6–10</th>
                            <th className="results-subtotal">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pairs.map((pair) => {
                            const firstHalf  = pair.rounds.slice(0, 5).reduce((a, b) => a + b, 0);
                            const secondHalf = pair.rounds.slice(5, 10).reduce((a, b) => a + b, 0);
                            return (
                                <tr key={pair.id} className={pair.rank <= 3 ? "top-rank" : undefined}>
                                    <td className="rank-cell">{pair.rank}</td>
                                    <td><strong>{pair.mrName}</strong></td>
                                    <td><strong>{pair.mrsName}</strong></td>
                                    {pair.rounds.slice(0, 5).map((r, i) => <td key={i}>{cell(r, i)}</td>)}
                                    <td className="results-subtotal">{playedRounds.size > 0 ? firstHalf : ""}</td>
                                    {pair.rounds.slice(5, 10).map((r, i) => <td key={i}>{cell(r, i + 5)}</td>)}
                                    <td className="results-subtotal">{playedRounds.size > 0 ? secondHalf : ""}</td>
                                    <td className="results-subtotal"><strong>{playedRounds.size > 0 ? pair.total : ""}</strong></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

type SectionFactory = (handle: React.ReactNode) => React.ReactNode;

export default function ResultsPage() {
    const { t } = useLanguage();
    const [liveData, setLiveData] = useState(readLiveData);
    const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(loadResultsOrder);
    const [dragFrom, setDragFrom] = useState<SectionKey | null>(null);
    const [dragOver, setDragOver] = useState<SectionKey | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    useEffect(() => {
        const refresh = () => setLiveData(readLiveData());
        const interval = setInterval(refresh, 3000);
        window.addEventListener("storage", refresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    if (!liveData) {
        return (
            <div className="admin-page">
                <div className="results-empty-state">
                    <span className="results-empty-icon"><Trophy size={40} aria-hidden="true" /></span>
                    <h2>{t.results_empty_heading}</h2>
                    <p>{t.results_empty_desc}</p>
                </div>
            </div>
        );
    }

    const { active, players, teamAssignments } = liveData;
    const presentClasses = [...new Set(players.map((p) => p.classLevel))].sort() as ClassLevel[];
    const teams           = rankTeams(players, teamAssignments);
    const herrPlayers     = players.filter((p) => p.ageCategory === "herr");
    const damPlayers      = players.filter((p) => p.ageCategory === "dam");
    const juniorPlayers   = players.filter((p) => p.ageCategory === "junior");
    const miniorPlayers   = players.filter((p) => p.ageCategory === "minior");

    const competitionId = active.runId.split("__")[0];
    const mixedPairs = active.typeName.includes("Mixed") ? buildMixedPairs(players, competitionId) : [];

    const sections: Partial<Record<SectionKey, SectionFactory>> = {};

    if (mixedPairs.length > 0) {
        sections["mixed-pairs"] = (h) => <MixedPairsBox pairs={mixedPairs} handle={h} />;
    }
    presentClasses.forEach((cl) => {
        const k = `class-${cl}` as SectionKey;
        const filtered = players.filter((p) => p.classLevel === cl);
        sections[k] = (handle) => <ClassResultBox classLevel={cl} players={filtered} handle={handle} />;
    });
    if (herrPlayers.length   > 0) sections.herr   = (h) => <CategoryResultBox title="Mr."     players={herrPlayers}   showClass handle={h} />;
    if (damPlayers.length    > 0) sections.dam     = (h) => <CategoryResultBox title="Mrs."    players={damPlayers}    showClass handle={h} />;
    if (juniorPlayers.length > 0) sections.junior  = (h) => <CategoryResultBox title="Junior"  players={juniorPlayers} showClass handle={h} />;
    if (miniorPlayers.length > 0) sections.minior  = (h) => <CategoryResultBox title="Minions" players={miniorPlayers} showClass handle={h} />;
    if (teams.length         > 0) sections.teams   = (h) => <TeamResultBox teams={teams} handle={h} />;

    const allKeys        = Object.keys(sections) as SectionKey[];
    const orderedKnown   = sectionOrder.filter((k) => k in sections);
    const untracked      = allKeys.filter((k) => !sectionOrder.includes(k));
    const activeSections = [...orderedKnown, ...untracked];

    function reorder(from: SectionKey, to: SectionKey) {
        const merged = [...sectionOrder];
        for (const k of DEFAULT_ORDER) { if (!merged.includes(k)) merged.push(k); }
        const fi = merged.indexOf(from);
        const ti = merged.indexOf(to);
        if (fi === -1 || ti === -1 || fi === ti) return;
        merged.splice(fi, 1);
        merged.splice(ti, 0, from);
        setSectionOrder(merged);
        saveResultsOrder(merged);
    }

    return (
        <div className="admin-page">
            <div className="admin-page-header results-page-header results-no-print">
                <div>
                    <p className="eyebrow">{t.results_eyebrow}</p>
                    <h1>{active.contestName}</h1>
                    <p>
                        {active.typeName} · {players.length}{" "}
                        {players.length === 1 ? t.results_player_s : t.results_player_p}{" "}
                        · {t.results_updates_auto}
                    </p>
                </div>
                <button className="secondary-action score-button" type="button" onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize size={17} aria-hidden="true" /> : <Maximize size={17} aria-hidden="true" />}
                    {isFullscreen ? (t.lang === "sv" ? "Minimera" : "Exit fullscreen") : (t.lang === "sv" ? "Helskärm" : "Fullscreen")}
                </button>
                <button className="secondary-action score-button" type="button" onClick={() => window.print()}>
                    <Printer size={17} aria-hidden="true" />
                    {t.results_print}
                </button>
            </div>

            <div className="results-print-title">
                <h1>{active.contestName}</h1>
                <p>{active.typeName}</p>
            </div>

            <div className="results-class-grid">
                {activeSections.map((key) => {
                    const handle = (
                        <div
                            className="results-drag-handle"
                            draggable
                            onDragStart={() => setDragFrom(key)}
                            title="Dra för att ändra ordning"
                        >
                            <GripVertical size={13} />
                        </div>
                    );
                    return (
                        <div
                            key={key}
                            className={[
                                "results-drag-item",
                                dragFrom === key                     ? "results-dragging"  : "",
                                dragOver === key && dragFrom !== key ? "results-drag-over" : "",
                            ].filter(Boolean).join(" ")}
                            onDragOver={(e) => { e.preventDefault(); if (dragFrom && dragFrom !== key) setDragOver(key); }}
                            onDrop={() => {
                                if (dragFrom && dragFrom !== key) reorder(dragFrom, key);
                                setDragFrom(null);
                                setDragOver(null);
                            }}
                            onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                        >
                            {sections[key]!(handle)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
