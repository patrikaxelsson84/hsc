import { ArrowLeft, Archive, ClipboardList, Play, Printer, RotateCcw, Save, Trash2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { samplePlayers } from "../data/sampleCompetition";
import type { AgeCategory, ClassLevel, PlayerScore, TeamAssignment } from "../lib/scoring";
import { rankPlayers } from "../lib/scoring";
import { useLanguage } from "../lib/language";
import { printProtokoll, printStartordning, printLaguppställning } from "../lib/printProtokoll";

function titleToAgeCategory(title: string): AgeCategory {
    if (title === "mrs") return "dam";
    if (title === "junior") return "junior";
    if (title === "minior") return "minior";
    return "herr";
}

function loadAllPlayers(): PlayerScore[] {
    try {
        const raw = localStorage.getItem("hsc-registrations");
        const registered: PlayerScore[] = raw
            ? (JSON.parse(raw) as { firstName: string; lastName: string; club: string; category: string; title: string; createdAt: string }[]).filter((e) => !["mix-d","dubbel","mr-d","mrs-d","team-g"].includes(e.category)).map((e) => ({
                  id: `reg-${e.createdAt}`,
                  name: `${e.firstName} ${e.lastName}`.trim(),
                  club: e.club ?? "",
                  classLevel: (Number(e.category) || 4) as ClassLevel,
                  ageCategory: titleToAgeCategory(e.title),
                  rounds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                  sevenMeters: 0,
              }))
            : [];
        const registeredNames = new Set(registered.map((p) => p.name.toLowerCase()));
        const base = samplePlayers.filter((p) => !registeredNames.has(p.name.toLowerCase()));
        return [...base, ...registered];
    } catch {
        return samplePlayers;
    }
}

const allClasses = "all";
const scoreStoragePrefix = "hsc-scores-v3";
const liveScorePrefix    = "hsc-live-v1";
const teamsStoragePrefix = "hsc-teams-v1";
const lanesStoragePrefix = "hsc-lanes-v1";
const activeContestKey   = "hsc-active-v1";
const typeIdSeparator    = "+";
type ClassFilter = ClassLevel | typeof allClasses;
type LaneFilter  = number | "all";
type ContestView = "menu" | "start" | "type" | "registration" | "lanes" | "teams" | "old" | "scoring";

const contestNames = [
    "Tingsryd Open","Björkenäs Open","Jämjö Open","SM ute","Lilltorp Open",
    "Roslagen Open","Wezet Open","Dynapac Open","Viby Open","Växjö Open inne",
    "Höstskon Carlskrona","Cup Sibbamåla Open","Värendspokalen","Moheda Open",
    "Växjö Open","Smålandsmästaren ute","Blekinge DM ute","Svealand DM ute",
    "Smålandsmästaren inne","Blekinge DM inne","Svealand DM inne","SM inne",
    "Gotland Open","Vaxholm Open","Åseda Open","Färsna Cup","Septemberskon",
    "Novemberkampen","Gotland DM inne","Gotland DM ute","Vaxholm Indoor Cup",
    "Sibbamålamästerskapet","Moheda-Ringen","Ölandsmästaren","Cementa Open",
];

const contests = contestNames.map((name) => ({
    id: name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
    name,
}));

const contestTypes = [
    "Mixed","Dubbel","Team","Mr.","Mrs.","Junior","Minions",
    "Mr. Double","Mrs. Double","Individual Rank",
].map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
    name,
}));

function getRunId(contestId: string, contestTypeId: string) {
    return `${contestId}__${contestTypeId}`;
}

function getTypeSelection(typeIds: string[]) {
    const types = typeIds
        .map((typeId) => contestTypes.find((item) => item.id === typeId))
        .filter((item): item is (typeof contestTypes)[number] => Boolean(item));
    return {
        ids:  types.map((type) => type.id),
        id:   types.map((type) => type.id).join(typeIdSeparator),
        name: types.map((type) => type.name).join(" + "),
    };
}

function parseTypeSelection(typeId: string) {
    return getTypeSelection(typeId.split(typeIdSeparator).filter(Boolean));
}

function getStoredScores(runId: string): PlayerScore[] {
    const stored = localStorage.getItem(`${scoreStoragePrefix}-${runId}`);
    if (stored) {
        try {
            const data = JSON.parse(stored) as PlayerScore[];
            if (data.length > 0) return data;
        } catch { /* fall through */ }
    }
    const live = localStorage.getItem(`${liveScorePrefix}-${runId}`);
    if (live) {
        try {
            const data = JSON.parse(live) as PlayerScore[];
            if (data.length > 0) return data;
        } catch { /* fall through */ }
    }
    return loadAllPlayers();
}

function resetPlayerScores(players: PlayerScore[]) {
    return players.map((p) => ({ ...p, rounds: Array.from({ length: 10 }, () => 0), sevenMeters: 0 }));
}

function getSavedContestIds() {
    const scoreRunIds = Object.keys(localStorage)
        .filter((key) => key.startsWith(`${scoreStoragePrefix}-`))
        .map((key) => key.slice(scoreStoragePrefix.length + 1));
    const scoreSet = new Set(scoreRunIds);
    const liveRunIds = Object.keys(localStorage)
        .filter((key) => key.startsWith(`${liveScorePrefix}-`))
        .map((key) => key.slice(liveScorePrefix.length + 1))
        .filter((runId) => {
            if (scoreSet.has(runId)) return false;
            try {
                const raw = localStorage.getItem(`${liveScorePrefix}-${runId}`);
                return raw ? (JSON.parse(raw) as PlayerScore[]).length > 0 : false;
            } catch { return false; }
        });
    return [...scoreRunIds, ...liveRunIds].filter((runId) => {
        const [contestId, typeId] = runId.split("__");
        return Boolean(contests.find((c) => c.id === contestId)) && parseTypeSelection(typeId).ids.length > 0;
    });
}

export default function ScoringPage() {
    const { t, lang } = useLanguage();

    const [view,                    setView]                    = useState<ContestView>("menu");
    const [competitionId,           setCompetitionId]           = useState(contests[0].id);
    const [selectedContestTypeIds,  setSelectedContestTypeIds]  = useState<string[]>([]);
    const [contestTypeId,           setContestTypeId]           = useState("");
    const [selectedPlayerIds,       setSelectedPlayerIds]       = useState<string[]>([]);
    const [clubFilter,              setClubFilter]              = useState<string>("all");
    const [classFilter,             setClassFilter]             = useState<ClassFilter>(allClasses);
    const [teamAssignments,         setTeamAssignments]         = useState<TeamAssignment[]>([]);
    const [activeTeamId,            setActiveTeamId]            = useState<string | null>(null);
    const [laneCount,               setLaneCount]               = useState(1);
    const [laneAssignments,         setLaneAssignments]         = useState<Record<string, number>>({});
    const [activeLane,              setActiveLane]              = useState<number | null>(null);
    const [laneScoreFilter,         setLaneScoreFilter]         = useState<LaneFilter>("all");
    const [players,                 setPlayers]                 = useState<PlayerScore[]>(loadAllPlayers);
    const [status,                  setStatus]                  = useState<"idle" | "saved" | "reset">("idle");
    const [oldContestIds,           setOldContestIds]           = useState<string[]>(getSavedContestIds);

    const competition   = contests.find((c) => c.id === competitionId) ?? contests[0];
    const contestType   = parseTypeSelection(contestTypeId);
    const currentRunId  = getRunId(competitionId, contestType.id);

    const oldContests = oldContestIds
        .map((runId) => {
            const [cid, tid] = runId.split("__");
            const contest = contests.find((c) => c.id === cid);
            const type    = parseTypeSelection(tid);
            return contest && type.ids.length > 0 ? { runId, contest, type } : null;
        })
        .filter((item): item is { runId: string; contest: (typeof contests)[number]; type: ReturnType<typeof parseTypeSelection> } => Boolean(item));

    const registrationPlayers = useMemo(
        () => loadAllPlayers().sort((a, b) =>
            a.club.localeCompare(b.club) || a.classLevel - b.classLevel || a.name.localeCompare(b.name)
        ),
        []
    );
    const registrationClubs = useMemo(
        () => [...new Set(registrationPlayers.map((p) => p.club || t.sc_no_team))].sort((a, b) => a.localeCompare(b)),
        [registrationPlayers, t.sc_no_team]
    );
    const filteredRegistrationPlayers = useMemo(
        () => clubFilter === "all" ? registrationPlayers : registrationPlayers.filter((p) => (p.club || t.sc_no_team) === clubFilter),
        [registrationPlayers, clubFilter, t.sc_no_team]
    );
    const visiblePlayers = useMemo(() => {
        let list = classFilter === allClasses ? players : players.filter((p) => p.classLevel === classFilter);
        if (laneScoreFilter !== "all") list = list.filter((p) => laneAssignments[p.id] === laneScoreFilter);
        return list;
    }, [classFilter, laneScoreFilter, players, laneAssignments]);

    const rankings   = rankPlayers(visiblePlayers);
    const rankMap    = new Map(rankings.map((r) => [r.id, r]));
    const scoringRows = visiblePlayers.map((p) => rankMap.get(p.id)!).filter(Boolean);
    const tiedTotals = (() => {
        const counts = new Map<number, number>();
        for (const p of rankings) counts.set(p.total, (counts.get(p.total) ?? 0) + 1);
        return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([t]) => t));
    })();
    const hasTies = tiedTotals.size > 0;

    function chooseContest(nextId: string) {
        setCompetitionId(nextId);
        setSelectedContestTypeIds([]); setContestTypeId(""); setSelectedPlayerIds([]);
        setClubFilter("all"); setClassFilter(allClasses); setLaneCount(1);
        setLaneAssignments({}); setActiveLane(null); setLaneScoreFilter("all");
        setStatus("idle"); setView("type");
    }

    function toggleContestType(id: string) {
        setSelectedContestTypeIds((cur) =>
            cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
        );
    }

    function continueWithContestTypes() {
        const sel = getTypeSelection(selectedContestTypeIds);
        if (sel.ids.length === 0) return;
        setContestTypeId(sel.id); setSelectedPlayerIds([]); setClubFilter("all");
        setPlayers([]); setClassFilter(allClasses); setLaneAssignments({});
        setActiveLane(null); setLaneScoreFilter("all"); setStatus("idle");
        setView("registration");
    }

    function openOldContest(runId: string) {
        const [nci, nti] = runId.split("__");
        const sel     = parseTypeSelection(nti);
        const contest = contests.find((c) => c.id === nci);
        const loaded  = getStoredScores(runId);
        localStorage.setItem(activeContestKey, JSON.stringify({ runId, contestName: contest?.name ?? nci, typeName: sel.name }));
        localStorage.setItem(`${liveScorePrefix}-${runId}`, JSON.stringify(loaded));
        const teamsRaw = localStorage.getItem(`${teamsStoragePrefix}-${runId}`);
        const loadedTeams: TeamAssignment[] = teamsRaw ? JSON.parse(teamsRaw) : [];
        const lanesRaw = localStorage.getItem(`${lanesStoragePrefix}-${runId}`);
        const savedLanes = lanesRaw ? JSON.parse(lanesRaw) as { count: number; assignments: Record<string, number> } : null;
        setCompetitionId(nci); setSelectedContestTypeIds(sel.ids); setContestTypeId(sel.id);
        setPlayers(loaded); setTeamAssignments(loadedTeams); setActiveTeamId(null);
        setLaneCount(savedLanes?.count ?? 1); setLaneAssignments(savedLanes?.assignments ?? {});
        setActiveLane(null); setLaneScoreFilter("all"); setSelectedPlayerIds([]);
        setClassFilter(allClasses); setStatus("idle"); setView("scoring");
    }

    function togglePlayer(id: string) {
        setSelectedPlayerIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    }

    function startRegisteredContest() {
        const registered = resetPlayerScores(registrationPlayers.filter((p) => selectedPlayerIds.includes(p.id)));
        localStorage.setItem(activeContestKey, JSON.stringify({ runId: currentRunId, contestName: competition.name, typeName: contestType.name }));
        localStorage.setItem(`${liveScorePrefix}-${currentRunId}`, JSON.stringify(registered));
        setPlayers(registered); setTeamAssignments([]); setActiveTeamId(null);
        setLaneAssignments({}); setActiveLane(null); setLaneScoreFilter("all");
        setClassFilter(allClasses); setStatus("idle");
        if (laneCount > 1) setView("lanes");
        else if (selectedContestTypeIds.includes("team")) setView("teams");
        else setView("scoring");
    }

    function saveTeamsToStorage(assignments: TeamAssignment[]) {
        const complete = assignments.filter((t) => t.playerIds.length === 4);
        if (complete.length > 0) localStorage.setItem(`${teamsStoragePrefix}-${currentRunId}`, JSON.stringify(complete));
        else localStorage.removeItem(`${teamsStoragePrefix}-${currentRunId}`);
    }

    function addNewTeam() {
        const n  = teamAssignments.length + 1;
        const id = `team-${Date.now()}`;
        const next = [...teamAssignments, { id, name: `${lang === "sv" ? "Lag" : "Team"} ${n}`, playerIds: [] }];
        setTeamAssignments(next); setActiveTeamId(id);
    }

    function updateTeamName(teamId: string, name: string) {
        setTeamAssignments((cur) => cur.map((t) => t.id === teamId ? { ...t, name } : t));
    }

    function togglePlayerInTeam(playerId: string) {
        if (!activeTeamId) return;
        setTeamAssignments((cur) => {
            const next = cur.map((team) => {
                if (team.id !== activeTeamId) return team;
                if (team.playerIds.includes(playerId)) return { ...team, playerIds: team.playerIds.filter((id) => id !== playerId) };
                if (team.playerIds.length >= 4) return team;
                const newPlayerIds = [...team.playerIds, playerId];
                let { name } = team;
                if (newPlayerIds.length === 1) {
                    const teamIndex = cur.findIndex((t) => t.id === team.id);
                    const defaultName = `${lang === "sv" ? "Lag" : "Team"} ${teamIndex + 1}`;
                    if (name === defaultName) {
                        const club = registrationPlayers.find((p) => p.id === playerId)?.club || t.sc_no_team;
                        const sibling = cur.filter((t) => t.id !== team.id && t.playerIds.length > 0 && (registrationPlayers.find((p) => p.id === t.playerIds[0])?.club || t.sc_no_team) === club).length;
                        name = sibling === 0 ? club : `${club} ${sibling + 1}`;
                    }
                }
                return { ...team, name, playerIds: newPlayerIds };
            });
            saveTeamsToStorage(next);
            return next;
        });
    }

    function removeTeam(teamId: string) {
        const next = teamAssignments.filter((t) => t.id !== teamId);
        setTeamAssignments(next);
        if (activeTeamId === teamId) setActiveTeamId(next[next.length - 1]?.id ?? null);
        saveTeamsToStorage(next);
    }

    function saveLanesToStorage(count: number, assignments: Record<string, number>) {
        localStorage.setItem(`${lanesStoragePrefix}-${currentRunId}`, JSON.stringify({ count, assignments }));
    }

    function togglePlayerLane(playerId: string) {
        if (!activeLane) return;
        setLaneAssignments((prev) => {
            const next = { ...prev };
            if (next[playerId] === activeLane) delete next[playerId];
            else next[playerId] = activeLane;
            saveLanesToStorage(laneCount, next);
            return next;
        });
    }

    function continueFromLanes() {
        saveLanesToStorage(laneCount, laneAssignments);
        setActiveLane(null);
        if (selectedContestTypeIds.includes("team")) setView("teams");
        else setView("scoring");
    }

    function updateRound(playerId: string, roundIndex: number, value: string) {
        const score = Math.max(0, Math.min(64, Number(value) || 0));
        setPlayers((cur) => {
            const next = cur.map((p) =>
                p.id === playerId
                    ? { ...p, rounds: p.rounds.map((r, i) => i === roundIndex ? score : r) }
                    : p
            );
            localStorage.setItem(`${liveScorePrefix}-${currentRunId}`, JSON.stringify(next));
            return next;
        });
        setStatus("idle");
    }

    function updateSevenMeters(playerId: string, value: string) {
        const sevenMeters = Math.max(0, Number(value) || 0);
        setPlayers((cur) => {
            const next = cur.map((p) => p.id === playerId ? { ...p, sevenMeters } : p);
            localStorage.setItem(`${liveScorePrefix}-${currentRunId}`, JSON.stringify(next));
            return next;
        });
        setStatus("idle");
    }

    function saveScores() {
        localStorage.setItem(`${scoreStoragePrefix}-${currentRunId}`, JSON.stringify(players));
        localStorage.setItem(`${liveScorePrefix}-${currentRunId}`, JSON.stringify(players));
        localStorage.setItem(activeContestKey, JSON.stringify({ runId: currentRunId, contestName: competition.name, typeName: contestType.name }));
        setOldContestIds((cur) => cur.includes(currentRunId) ? cur : [...cur, currentRunId]);
        setStatus("saved");
    }

    function resetScores() {
        localStorage.removeItem(`${scoreStoragePrefix}-${currentRunId}`);
        localStorage.removeItem(`${liveScorePrefix}-${currentRunId}`);
        localStorage.removeItem(`${teamsStoragePrefix}-${currentRunId}`);
        localStorage.removeItem(`${lanesStoragePrefix}-${currentRunId}`);
        localStorage.removeItem(activeContestKey);
        setPlayers((cur) => resetPlayerScores(cur));
        setTeamAssignments([]); setActiveTeamId(null); setLaneAssignments({});
        setActiveLane(null); setLaneScoreFilter("all");
        setOldContestIds((cur) => cur.filter((id) => id !== currentRunId));
        setStatus("reset");
    }

    function deleteOldContest(runId: string) {
        localStorage.removeItem(`${scoreStoragePrefix}-${runId}`);
        localStorage.removeItem(`${liveScorePrefix}-${runId}`);
        localStorage.removeItem(`${teamsStoragePrefix}-${runId}`);
        localStorage.removeItem(`${lanesStoragePrefix}-${runId}`);
        const active = localStorage.getItem(activeContestKey);
        if (active) {
            try { if ((JSON.parse(active) as { runId: string }).runId === runId) localStorage.removeItem(activeContestKey); } catch { /* empty */ }
        }
        setOldContestIds((cur) => cur.filter((id) => id !== runId));
    }

    function resetEverything() {
        if (!window.confirm(lang === "sv" ? "Radera ALLA tävlingar och poäng? Detta går inte att ångra." : "Delete ALL contests and scores? This cannot be undone.")) return;
        Object.keys(localStorage)
            .filter((k) =>
                k.startsWith(`${scoreStoragePrefix}-`) ||
                k.startsWith(`${liveScorePrefix}-`) ||
                k.startsWith(`${teamsStoragePrefix}-`) ||
                k.startsWith(`${lanesStoragePrefix}-`)
            )
            .forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem(activeContestKey);
        setOldContestIds([]);
        setPlayers(loadAllPlayers());
        setTeamAssignments([]); setActiveTeamId(null);
        setLaneAssignments({}); setActiveLane(null);
        setStatus("reset");
        setView("menu");
    }

    // ── MENU ────────────────────────────────────────────────────────────────
    if (view === "menu") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{t.sc_eyebrow_menu}</p>
                        <h1>{t.sc_heading_menu}</h1>
                        <p>{t.sc_desc_menu}</p>
                    </div>
                    <button className="danger-action score-button" type="button" onClick={resetEverything}>
                        <Trash2 size={17} aria-hidden="true" />
                        {lang === "sv" ? "Rensa allt" : "Reset all"}
                    </button>
                </div>

                <section className="admin-choice-grid" aria-label={t.sc_heading_menu}>
                    <button className="admin-choice-card" type="button" onClick={() => setView("start")}>
                        <span className="admin-choice-icon"><Play size={24} aria-hidden="true" /></span>
                        <span>
                            <strong>{t.sc_start_title}</strong>
                            <span>{t.sc_start_desc}</span>
                        </span>
                        <Play size={20} aria-hidden="true" />
                    </button>

                    <button className="admin-choice-card" type="button" onClick={() => setView("old")}>
                        <span className="admin-choice-icon"><Archive size={24} aria-hidden="true" /></span>
                        <span>
                            <strong>{t.sc_old_title}</strong>
                            <span>{t.sc_old_desc}</span>
                        </span>
                        <Archive size={20} aria-hidden="true" />
                    </button>
                </section>
            </div>
        );
    }

    // ── CHOOSE CONTEST ───────────────────────────────────────────────────────
    if (view === "start") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{t.sc_start_title}</p>
                        <h1>{t.sc_heading_choose}</h1>
                        <p>{t.sc_desc_choose}</p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("menu")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        {t.sc_back}
                    </button>
                </div>

                <section className="contest-grid" aria-label={t.sc_heading_choose}>
                    {contests.map((contest) => (
                        <button className="contest-card" key={contest.id} type="button" onClick={() => chooseContest(contest.id)}>
                            <span className="contest-card-icon"><Trophy size={20} aria-hidden="true" /></span>
                            <span>{contest.name}</span>
                        </button>
                    ))}
                </section>
            </div>
        );
    }

    // ── OLD CONTESTS ─────────────────────────────────────────────────────────
    if (view === "old") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{t.sc_old_title}</p>
                        <h1>{t.sc_heading_saved}</h1>
                        <p>{t.sc_desc_saved}</p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("menu")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        {t.sc_back}
                    </button>
                </div>

                {oldContests.length > 0 ? (
                    <section className="contest-grid" aria-label={t.sc_heading_saved}>
                        {oldContests.map((c) => (
                            <div className="contest-card-wrapper" key={c.runId}>
                                <button className="contest-card" type="button" onClick={() => openOldContest(c.runId)}>
                                    <span className="contest-card-icon"><Trophy size={20} aria-hidden="true" /></span>
                                    <span>{c.contest.name} – {c.type.name}</span>
                                </button>
                                <button
                                    className="comp-delete-btn contest-card-delete"
                                    type="button"
                                    aria-label={`${lang === "sv" ? "Ta bort" : "Delete"} ${c.contest.name}`}
                                    onClick={() => deleteOldContest(c.runId)}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </section>
                ) : (
                    <section className="admin-panel">
                        <div className="panel-title-row">
                            <h2>{t.sc_no_old_heading}</h2>
                            <span className="success-pill">{t.sc_no_old_pill}</span>
                        </div>
                        <p>{t.sc_no_old_desc}</p>
                    </section>
                )}
            </div>
        );
    }

    // ── CONTEST TYPE ─────────────────────────────────────────────────────────
    if (view === "type") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{t.sc_start_title}</p>
                        <h1>{competition.name}</h1>
                        <p>{t.sc_type_desc}</p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("start")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        {t.sc_back}
                    </button>
                </div>

                <section className="score-controls contest-registration-actions">
                    <span className="success-pill">
                        {selectedContestTypeIds.length} {t.sc_selected_suffix}
                    </span>
                    <button className="secondary-action score-button" type="button"
                        disabled={selectedContestTypeIds.length === 0}
                        onClick={() => setSelectedContestTypeIds([])}>
                        {t.sc_clear}
                    </button>
                    <button className="primary-action score-button" type="button"
                        disabled={selectedContestTypeIds.length === 0}
                        onClick={continueWithContestTypes}>
                        {t.sc_continue}
                    </button>
                </section>

                <div className="lane-count-section">
                    <span className="lane-count-label">{t.sc_lanes_label}</span>
                    <div className="lane-count-picker">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button key={n} type="button"
                                className={laneCount === n ? "lane-count-btn active" : "lane-count-btn"}
                                onClick={() => setLaneCount(n)}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <section className="contest-grid" aria-label={t.sc_start_title}>
                    {contestTypes.map((type) => (
                        <button
                            className={selectedContestTypeIds.includes(type.id) ? "contest-card selected" : "contest-card"}
                            key={type.id} type="button"
                            aria-pressed={selectedContestTypeIds.includes(type.id)}
                            onClick={() => toggleContestType(type.id)}>
                            <span className="contest-card-icon"><Trophy size={20} aria-hidden="true" /></span>
                            <span>{type.name}</span>
                        </button>
                    ))}
                </section>
            </div>
        );
    }

    // ── TEAM SETUP ───────────────────────────────────────────────────────────
    if (view === "teams") {
        const activePlayerList = registrationPlayers.filter((p) => selectedPlayerIds.includes(p.id));
        const assignedIds      = new Set(teamAssignments.flatMap((tm) => tm.playerIds));
        const clubs            = [...new Set(activePlayerList.map((p) => p.club || t.sc_no_team))].sort();
        const activeTeam       = teamAssignments.find((tm) => tm.id === activeTeamId) ?? null;
        const activeTeamFull   = (activeTeam?.playerIds.length ?? 0) >= 4;
        const completeCount    = teamAssignments.filter((tm) => tm.playerIds.length === 4).length;

        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{t.sc_team_eyebrow}</p>
                        <h1>{competition.name}</h1>
                        <p>
                            {completeCount} {completeCount === 1 ? t.sc_team_s : t.sc_team_p}{" "}
                            {lang === "sv" ? "komplett" : "complete"}.{" "}
                            {lang === "sv"
                                ? "Klicka på ett lagkort för att välja det, välj sedan spelare."
                                : "Click a team card to select it, then pick players."}
                        </p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("registration")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        {t.sc_back}
                    </button>
                </div>

                <section className="score-controls">
                    <button className="secondary-action score-button" type="button" onClick={addNewTeam}>
                        {t.sc_add_team}
                    </button>
                    <button className="primary-action score-button" type="button" onClick={() => { saveTeamsToStorage(teamAssignments); setView("scoring"); }}>
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
                                <div
                                    key={team.id}
                                    className={["team-slot-card", isActive ? "is-active" : "", isComplete ? "is-complete" : ""].filter(Boolean).join(" ")}
                                    role="button" tabIndex={0}
                                    onClick={() => setActiveTeamId(team.id)}
                                    onKeyDown={(e) => e.key === "Enter" && setActiveTeamId(team.id)}
                                >
                                    <div className="team-slot-card-header">
                                        <input className="team-name-input" value={team.name}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updateTeamName(team.id, e.target.value)}
                                            aria-label={lang === "sv" ? "Lagnamn" : "Team name"} />
                                        <button className="team-slot-remove" type="button"
                                            aria-label={`${lang === "sv" ? "Ta bort" : "Remove"} ${team.name}`}
                                            onClick={(e) => { e.stopPropagation(); removeTeam(team.id); }}>
                                            ×
                                        </button>
                                    </div>
                                    <ol className="team-slot-list">
                                        {[0, 1, 2, 3].map((i) => {
                                            const pid  = team.playerIds[i];
                                            const name = pid ? activePlayerList.find((p) => p.id === pid)?.name : null;
                                            return (
                                                <li key={i} className={name ? "filled" : "empty"}>
                                                    {name ?? "—"}
                                                    {pid && (
                                                        <button type="button" className="team-slot-unassign"
                                                            aria-label={`${lang === "sv" ? "Ta bort" : "Remove"} ${name}`}
                                                            onClick={(e) => { e.stopPropagation(); togglePlayerInTeam(pid); setActiveTeamId(team.id); }}>
                                                            ×
                                                        </button>
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
                            <strong>{activeTeam?.name}</strong> — {activeTeam?.playerIds.length ?? 0} / 4{" "}
                            {t.sc_selected_suffix}
                        </p>
                        {clubs.map((club) => {
                            const clubPlayers = activePlayerList.filter((p) => (p.club || t.sc_no_team) === club);
                            return (
                                <section key={club} className="team-club-section">
                                    <h3 className="team-club-title">{club}</h3>
                                    <div className="team-player-grid">
                                        {clubPlayers.map((player) => {
                                            const inActive  = activeTeam?.playerIds.includes(player.id) ?? false;
                                            const inOther   = !inActive && assignedIds.has(player.id);
                                            const otherTeam = inOther ? teamAssignments.find((tm) => tm.playerIds.includes(player.id)) : null;
                                            return (
                                                <button key={player.id} type="button"
                                                    className={["team-player-card", inActive ? "is-pending" : "", inOther ? "is-assigned" : ""].filter(Boolean).join(" ")}
                                                    disabled={inOther || (activeTeamFull && !inActive)}
                                                    onClick={() => togglePlayerInTeam(player.id)}>
                                                    <span className="team-player-name">{player.name}</span>
                                                    <span className="team-player-meta">
                                                        {t.sc_class_prefix} {player.classLevel} · {player.ageCategory}
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

    // ── LANE ASSIGNMENT ──────────────────────────────────────────────────────
    if (view === "lanes") {
        const activePlayerList = registrationPlayers.filter((p) => selectedPlayerIds.includes(p.id));
        const clubs = [...new Set(activePlayerList.map((p) => p.club || t.sc_no_team))].sort();
        const lanes = Array.from({ length: laneCount }, (_, i) => i + 1);

        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{t.sc_lane_eyebrow}</p>
                        <h1>{competition.name}</h1>
                        <p>
                            {Object.keys(laneAssignments).length}{" "}
                            {lang === "sv" ? "av" : "of"}{" "}
                            {activePlayerList.length}{" "}
                            {t.sc_player_p}{" "}
                            {lang === "sv"
                                ? "tilldelade. Klicka på en bana, sedan på spelare för att placera dem."
                                : "assigned. Click a lane, then tap players to place them."}
                        </p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("registration")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        {t.sc_back}
                    </button>
                </div>

                <section className="score-controls">
                    <button className="primary-action score-button" type="button" onClick={continueFromLanes}>
                        {t.sc_lane_cont}
                    </button>
                </section>

                <div className="lane-selector-row" role="group" aria-label={lang === "sv" ? "Välj bana" : "Select lane"}>
                    {lanes.map((lane) => {
                        const count = activePlayerList.filter((p) => laneAssignments[p.id] === lane).length;
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
                    <>
                        <p className="team-pick-label">
                            {lang === "sv" ? "Placerar spelare på" : "Placing players on"}{" "}
                            <strong>{t.sc_lane_prefix} {activeLane}</strong>
                        </p>
                        {clubs.map((club) => {
                            const clubPlayers = activePlayerList.filter((p) => (p.club || t.sc_no_team) === club);
                            return (
                                <section key={club} className="team-club-section">
                                    <h3 className="team-club-title">{club}</h3>
                                    <div className="team-player-grid">
                                        {clubPlayers.map((player) => {
                                            const playerLane = laneAssignments[player.id];
                                            const onActive   = playerLane === activeLane;
                                            const onOther    = playerLane !== undefined && !onActive;
                                            return (
                                                <button key={player.id} type="button"
                                                    className={["team-player-card", onActive ? "is-pending" : "", onOther ? "is-assigned" : ""].filter(Boolean).join(" ")}
                                                    onClick={() => togglePlayerLane(player.id)}>
                                                    <span className="team-player-name">{player.name}</span>
                                                    <span className="team-player-meta">
                                                        {t.sc_class_prefix} {player.classLevel} · {player.ageCategory}
                                                    </span>
                                                    {playerLane && (
                                                        <span className="team-badge">{t.sc_lane_prefix} {playerLane}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </>
                ) : (
                    <p className="form-message">{t.sc_select_lane_hint}</p>
                )}
            </div>
        );
    }

    // ── PLAYER REGISTRATION FOR CONTEST ─────────────────────────────────────
    if (view === "registration") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">{t.sc_reg_eyebrow}</p>
                        <h1>{competition.name}</h1>
                        <p>
                            {lang === "sv"
                                ? `Registrera spelare för ${contestType.name}. Valda: ${selectedPlayerIds.length}`
                                : `Register players for ${contestType.name}. Selected: ${selectedPlayerIds.length}`}
                        </p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("type")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        {t.sc_back}
                    </button>
                </div>

                <section className="score-controls contest-registration-actions">
                    <button className="secondary-action score-button" type="button"
                        onClick={() => setSelectedPlayerIds((prev) => {
                            const toAdd = filteredRegistrationPlayers.map((p) => p.id).filter((id) => !prev.includes(id));
                            return [...prev, ...toAdd];
                        })}>
                        {t.sc_select_all}
                    </button>
                    <button className="secondary-action score-button" type="button"
                        onClick={() => setSelectedPlayerIds([])}>
                        {t.sc_clear}
                    </button>
                    <button className="primary-action score-button" type="button"
                        disabled={selectedPlayerIds.length === 0}
                        onClick={startRegisteredContest}>
                        {t.sc_start_registered}
                    </button>
                </section>

                <div className="club-filter-bar" role="group" aria-label={lang === "sv" ? "Filtrera efter klubb" : "Filter by club"}>
                    <button className={clubFilter === "all" ? "club-filter-chip active" : "club-filter-chip"}
                        type="button" onClick={() => setClubFilter("all")}>
                        {t.sc_all_clubs}
                        <span className="club-chip-count">{registrationPlayers.length}</span>
                    </button>
                    {registrationClubs.map((club) => {
                        const cp  = registrationPlayers.filter((p) => (p.club || t.sc_no_team) === club);
                        const sel = cp.filter((p) => selectedPlayerIds.includes(p.id)).length;
                        return (
                            <button className={clubFilter === club ? "club-filter-chip active" : "club-filter-chip"}
                                key={club} type="button"
                                onClick={() => setClubFilter(clubFilter === club ? "all" : club)}>
                                {club}
                                <span className="club-chip-count">
                                    {sel > 0 ? `${sel}/` : ""}{cp.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="table-shell">
                    <table>
                        <thead>
                            <tr>
                                <th>{t.sc_col_join}</th>
                                <th>{t.sc_col_name}</th>
                                {clubFilter === "all" && <th>{t.sc_col_club}</th>}
                                <th>{t.sc_col_class}</th>
                                <th>{t.sc_col_category}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRegistrationPlayers.map((player) => (
                                <tr key={player.id}>
                                    <td>
                                        <input
                                            aria-label={`${lang === "sv" ? "Registrera" : "Register"} ${player.name}`}
                                            checked={selectedPlayerIds.includes(player.id)}
                                            type="checkbox"
                                            onChange={() => togglePlayer(player.id)}
                                        />
                                    </td>
                                    <td>{player.name}</td>
                                    {clubFilter === "all" && <td>{player.club || t.sc_no_team}</td>}
                                    <td>{t.sc_class_prefix} {player.classLevel}</td>
                                    <td>{player.ageCategory}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // ── SCORING ──────────────────────────────────────────────────────────────
    const savedMsg = lang === "sv"
        ? `Poäng sparade för ${competition.name} – ${contestType.name}.`
        : `Scores saved for ${competition.name} – ${contestType.name}.`;
    const resetMsg = lang === "sv"
        ? `Poäng återställda för ${competition.name} – ${contestType.name}.`
        : `Scores reset for ${competition.name} – ${contestType.name}.`;

    return (
        <div className="admin-page">
            <div className="admin-page-header startlist-no-print">
                <div>
                    <p className="eyebrow">{t.sc_eyebrow_scoring}</p>
                    <h1>{competition.name}</h1>
                    <p>
                        {contestType.name}{" "}
                        {lang === "sv" ? "med" : "with"}{" "}
                        {players.length} {players.length === 1 ? t.sc_player_s : t.sc_player_p}{" "}
                        {lang === "sv" ? "registrerade" : "registered"}.
                    </p>
                </div>
                <button className="secondary-action roster-back-button" type="button" onClick={() => setView("menu")}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    {t.sc_contest_center}
                </button>
            </div>

            <section className="score-controls startlist-no-print">
                <label>
                    {t.sc_class_label}
                    <select value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value === allClasses ? allClasses : (Number(e.target.value) as ClassLevel))}>
                        <option value={allClasses}>{t.sc_all_classes}</option>
                        <option value={1}>{t.sc_class_prefix} 1</option>
                        <option value={2}>{t.sc_class_prefix} 2</option>
                        <option value={3}>{t.sc_class_prefix} 3</option>
                        <option value={4}>{t.sc_class_prefix} 4</option>
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

                <button className="secondary-action score-button startlist-no-print" type="button" onClick={() => window.print()}>
                    <Printer size={17} aria-hidden="true" />
                    {t.sc_print_list}
                </button>
                <button className="secondary-action score-button startlist-no-print" type="button"
                    onClick={() => printStartordning({
                        competitionName: competition.name,
                        players,
                        laneAssignments,
                        laneCount,
                        laneFilter: laneScoreFilter,
                        lang,
                    })}>
                    <ClipboardList size={17} aria-hidden="true" />
                    {lang === "sv" ? "Startordning" : "Start list"}
                </button>
                <button className="secondary-action score-button startlist-no-print" type="button"
                    onClick={() => printProtokoll({
                        competitionName: competition.name,
                        typeName: contestType.name,
                        players,
                        laneAssignments,
                        laneCount,
                        laneFilter: laneScoreFilter,
                        lang,
                    })}>
                    <ClipboardList size={17} aria-hidden="true" />
                    {lang === "sv" ? "Domarprotokoll" : "Protocol"}
                </button>
                <button className="secondary-action score-button startlist-no-print" type="button"
                    onClick={() => printLaguppställning({
                        competitionName: competition.name,
                        players,
                        teamAssignments,
                        lang,
                    })}>
                    <ClipboardList size={17} aria-hidden="true" />
                    {lang === "sv" ? "Laguppställning" : "Team lineup"}
                </button>
                <button className="secondary-action score-button startlist-no-print" type="button" onClick={resetScores}>
                    <RotateCcw size={17} aria-hidden="true" />
                    {t.sc_reset}
                </button>
                <button className="primary-action score-button" type="button" onClick={saveScores}>
                    <Save size={17} aria-hidden="true" />
                    {t.sc_save_scores}
                </button>
            </section>

            {status !== "idle" && (
                <p className="form-message startlist-no-print">
                    {status === "saved" ? savedMsg : resetMsg}
                </p>
            )}

            {/* Print-only start list */}
            <div className="startlist-print-only">
                <div className="startlist-print-header">
                    <h1>{competition.name}</h1>
                    <p>{contestType.name} · {players.length} {t.sc_player_p}</p>
                </div>
                {laneCount > 1
                    ? Array.from({ length: laneCount }, (_, i) => i + 1).map((lane) => {
                        const lanePlayers = players.filter((p) => laneAssignments[p.id] === lane);
                        return (
                            <section key={lane} className="startlist-group">
                                <h2>{t.sc_lane_prefix} {lane}</h2>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>{t.sc_col_name}</th>
                                            <th>{t.sc_col_club}</th>
                                            <th>{t.sc_class_prefix}</th>
                                            {Array.from({ length: 10 }, (_, i) => <th key={i}>R{i + 1}</th>)}
                                            <th>1–5</th><th>6–10</th><th>{t.sc_col_total}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lanePlayers.map((player, idx) => (
                                            <tr key={player.id}>
                                                <td>{idx + 1}</td>
                                                <td>{player.name}</td>
                                                <td>{player.club || "–"}</td>
                                                <td>{player.classLevel}</td>
                                                {Array.from({ length: 12 }, (_, i) => <td key={i}></td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        );
                    })
                    : ([1, 2, 3, 4] as ClassLevel[]).map((cl) => {
                        const classPlayers = players.filter((p) => p.classLevel === cl);
                        if (classPlayers.length === 0) return null;
                        return (
                            <section key={cl} className="startlist-group">
                                <h2>{t.sc_class_prefix} {cl}</h2>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>{t.sc_col_name}</th>
                                            <th>{t.sc_col_club}</th>
                                            {Array.from({ length: 10 }, (_, i) => <th key={i}>R{i + 1}</th>)}
                                            <th>1–5</th><th>6–10</th><th>{t.sc_col_total}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classPlayers.map((player, idx) => (
                                            <tr key={player.id}>
                                                <td>{idx + 1}</td>
                                                <td>{player.name}</td>
                                                <td>{player.club || "–"}</td>
                                                {Array.from({ length: 12 }, (_, i) => <td key={i}></td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        );
                    })
                }
            </div>

            <div className="score-entry-shell startlist-no-print">
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
                            <th>{t.sc_col_points}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scoringRows.map((player) => (
                            <tr key={player.id}>
                                <td>
                                    <strong>{player.name}</strong>
                                    <span>{player.club} · {t.sc_class_prefix} {player.classLevel}</span>
                                </td>
                                {player.rounds.map((round, index) => (
                                    <td key={`${player.id}-${index}`}>
                                        <input
                                            aria-label={`${player.name} R${index + 1}`}
                                            inputMode="numeric" min={0} max={64} type="number"
                                            value={round}
                                            onChange={(e) => updateRound(player.id, index, e.target.value)}
                                        />
                                    </td>
                                ))}
                                {hasTies && (
                                    <td>
                                        {tiedTotals.has(player.total) ? (
                                            <input
                                                aria-label={`${player.name} 7m`}
                                                inputMode="numeric" min={0} type="number"
                                                value={player.sevenMeters}
                                                onChange={(e) => updateSevenMeters(player.id, e.target.value)}
                                            />
                                        ) : null}
                                    </td>
                                )}
                                <td>{player.firstHalf}</td>
                                <td>{player.secondHalf}</td>
                                <td>{player.total}</td>
                                <td>{player.rank}</td>
                                <td>{player.rankingPoints}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <section className="admin-panel startlist-no-print">
                <div className="panel-title-row">
                    <h2>{t.sc_summary_title}</h2>
                    <span className="success-pill">{contestType.name}</span>
                </div>
                <p>{t.sc_summary_desc}</p>
            </section>
        </div>
    );
}
