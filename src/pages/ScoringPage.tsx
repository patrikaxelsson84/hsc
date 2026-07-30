import { ArrowLeft, Archive, Play, Printer, RotateCcw, Save, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { samplePlayers } from "../data/sampleCompetition";
import type { AgeCategory, ClassLevel, PlayerScore, TeamAssignment } from "../lib/scoring";
import { rankPlayers } from "../lib/scoring";

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
            ? (JSON.parse(raw) as { firstName: string; lastName: string; club: string; category: string; title: string; createdAt: string }[]).map((e) => ({
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
const liveScorePrefix = "hsc-live-v1";
const teamsStoragePrefix = "hsc-teams-v1";
const lanesStoragePrefix = "hsc-lanes-v1";
const activeContestKey = "hsc-active-v1";
const typeIdSeparator = "+";
type ClassFilter = ClassLevel | typeof allClasses;
type LaneFilter = number | "all";
type ContestView = "menu" | "start" | "type" | "registration" | "lanes" | "teams" | "old" | "scoring";

const contestNames = [
    "Tingsryd Open",
    "Björkenäs Open",
    "Jämjö Open",
    "SM ute",
    "Lilltorp Open",
    "Roslagen Open",
    "Wezet Open",
    "Dynapac Open",
    "Viby Open",
    "Växjö Open inne",
    "Höstskon Carlskrona",
    "Cup Sibbamåla Open",
    "Värendspokalen",
    "Moheda Open",
    "Växjö Open",
    "Smålandsmästaren ute",
    "Blekinge DM ute",
    "Svealand DM ute",
    "Smålandsmästaren inne",
    "Blekinge DM inne",
    "Svealand DM inne",
    "SM inne",
    "Gotland Open",
    "Vaxholm Open",
    "Åseda Open",
    "Färsna Cup",
    "Septemberskon",
    "Novemberkampen",
    "Gotland DM inne",
    "Gotland DM ute",
    "Vaxholm Indoor Cup",
    "Sibbamålamästerskapet",
    "Moheda-Ringen",
    "Ölandsmästaren",
    "Cementa Open",
];

const contests = contestNames.map((name) => ({
    id: name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    name,
}));

const contestTypes = [
    "Class",
    "Dubbel",
    "Mixed",
    "Team",
    "Mr.",
    "Mrs.",
    "Junior",
    "Minions",
    "Individual",
    "Mr. Double",
    "Mrs. Double",
    "Bonus hunt",
    "Second chance",
    "International match",
].map((name) => ({
    id: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
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
        ids: types.map((type) => type.id),
        id: types.map((type) => type.id).join(typeIdSeparator),
        name: types.map((type) => type.name).join(" + "),
    };
}

function parseTypeSelection(typeId: string) {
    return getTypeSelection(typeId.split(typeIdSeparator).filter(Boolean));
}

function getStoredScores(runId: string) {
    const stored = localStorage.getItem(`${scoreStoragePrefix}-${runId}`);

    if (!stored) {
        return loadAllPlayers();
    }

    try {
        return JSON.parse(stored) as PlayerScore[];
    } catch {
        return loadAllPlayers();
    }
}

function resetPlayerScores(players: PlayerScore[]) {
    return players.map((player) => ({
        ...player,
        rounds: Array.from({ length: 10 }, () => 0),
        sevenMeters: 0,
    }));
}

function getSavedContestIds() {
    return Object.keys(localStorage)
        .filter((key) => key.startsWith(`${scoreStoragePrefix}-`))
        .map((key) => key.slice(scoreStoragePrefix.length + 1))
        .filter((runId) => {
            const [contestId, typeId] = runId.split("__");

            return Boolean(contests.find((contest) => contest.id === contestId)) && parseTypeSelection(typeId).ids.length > 0;
        });
}

export default function ScoringPage() {
    const [view, setView] = useState<ContestView>("menu");
    const [competitionId, setCompetitionId] = useState(contests[0].id);
    const [selectedContestTypeIds, setSelectedContestTypeIds] = useState<string[]>([]);
    const [contestTypeId, setContestTypeId] = useState("");
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [clubFilter, setClubFilter] = useState<string>("all");
    const [classFilter, setClassFilter] = useState<ClassFilter>(allClasses);
    const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
    const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
    const [laneCount, setLaneCount] = useState(1);
    const [laneAssignments, setLaneAssignments] = useState<Record<string, number>>({});
    const [activeLane, setActiveLane] = useState<number | null>(null);
    const [laneScoreFilter, setLaneScoreFilter] = useState<LaneFilter>("all");
    const [players, setPlayers] = useState<PlayerScore[]>(loadAllPlayers);
    const [status, setStatus] = useState<"idle" | "saved" | "reset">("idle");
    const [oldContestIds, setOldContestIds] = useState<string[]>(getSavedContestIds);
    const competition = contests.find((item) => item.id === competitionId) ?? contests[0];
    const contestType = parseTypeSelection(contestTypeId);
    const currentRunId = getRunId(competitionId, contestType.id);
    const oldContests = oldContestIds
        .map((runId) => {
            const [contestId, typeId] = runId.split("__");
            const contest = contests.find((item) => item.id === contestId);
            const type = parseTypeSelection(typeId);

            return contest && type.ids.length > 0 ? { runId, contest, type } : null;
        })
        .filter((item): item is { runId: string; contest: (typeof contests)[number]; type: ReturnType<typeof parseTypeSelection> } =>
            Boolean(item)
        );
    const registrationPlayers = useMemo(
        () =>
            loadAllPlayers().sort(
                (firstPlayer, secondPlayer) =>
                    firstPlayer.club.localeCompare(secondPlayer.club) ||
                    firstPlayer.classLevel - secondPlayer.classLevel ||
                    firstPlayer.name.localeCompare(secondPlayer.name)
            ),
        []
    );
    const registrationClubs = useMemo(
        () => [...new Set(registrationPlayers.map((p) => p.club || "No club"))].sort((a, b) => a.localeCompare(b)),
        [registrationPlayers]
    );
    const filteredRegistrationPlayers = useMemo(
        () =>
            clubFilter === "all"
                ? registrationPlayers
                : registrationPlayers.filter((p) => (p.club || "No club") === clubFilter),
        [registrationPlayers, clubFilter]
    );
    const visiblePlayers = useMemo(() => {
        let list = classFilter === allClasses ? players : players.filter((p) => p.classLevel === classFilter);
        if (laneScoreFilter !== "all") list = list.filter((p) => laneAssignments[p.id] === laneScoreFilter);
        return list;
    }, [classFilter, laneScoreFilter, players, laneAssignments]);
    const rankings = rankPlayers(visiblePlayers);
    const rankMap = new Map(rankings.map((r) => [r.id, r]));
    const scoringRows = visiblePlayers.map((p) => rankMap.get(p.id)!).filter(Boolean);
    const tiedTotals = (() => {
        const counts = new Map<number, number>();
        for (const p of rankings) counts.set(p.total, (counts.get(p.total) ?? 0) + 1);
        return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([t]) => t));
    })();
    const hasTies = tiedTotals.size > 0;

    function chooseContest(nextCompetitionId: string) {
        setCompetitionId(nextCompetitionId);
        setSelectedContestTypeIds([]);
        setContestTypeId("");
        setSelectedPlayerIds([]);
        setClubFilter("all");
        setClassFilter(allClasses);
        setLaneCount(1);
        setLaneAssignments({});
        setActiveLane(null);
        setLaneScoreFilter("all");
        setStatus("idle");
        setView("type");
    }

    function toggleContestType(nextContestTypeId: string) {
        setSelectedContestTypeIds((current) =>
            current.includes(nextContestTypeId)
                ? current.filter((id) => id !== nextContestTypeId)
                : [...current, nextContestTypeId]
        );
    }

    function clearContestTypes() {
        setSelectedContestTypeIds([]);
    }

    function continueWithContestTypes() {
        const nextSelection = getTypeSelection(selectedContestTypeIds);

        if (nextSelection.ids.length === 0) {
            return;
        }

        setContestTypeId(nextSelection.id);
        setSelectedPlayerIds([]);
        setClubFilter("all");
        setPlayers([]);
        setClassFilter(allClasses);
        setLaneAssignments({});
        setActiveLane(null);
        setLaneScoreFilter("all");
        setStatus("idle");
        setView("registration");
    }

    function openOldContest(runId: string) {
        const [nextCompetitionId, nextContestTypeId] = runId.split("__");
        const nextSelection = parseTypeSelection(nextContestTypeId);
        const nextContest = contests.find((item) => item.id === nextCompetitionId);
        const loadedPlayers = getStoredScores(runId);

        localStorage.setItem(activeContestKey, JSON.stringify({ runId, contestName: nextContest?.name ?? nextCompetitionId, typeName: nextSelection.name }));
        localStorage.setItem(`${liveScorePrefix}-${runId}`, JSON.stringify(loadedPlayers));

        const savedTeamsRaw = localStorage.getItem(`${teamsStoragePrefix}-${runId}`);
        const loadedTeams: TeamAssignment[] = savedTeamsRaw ? JSON.parse(savedTeamsRaw) : [];

        const savedLanesRaw = localStorage.getItem(`${lanesStoragePrefix}-${runId}`);
        const savedLanes = savedLanesRaw ? JSON.parse(savedLanesRaw) as { count: number; assignments: Record<string, number> } : null;

        setCompetitionId(nextCompetitionId);
        setSelectedContestTypeIds(nextSelection.ids);
        setContestTypeId(nextSelection.id);
        setPlayers(loadedPlayers);
        setTeamAssignments(loadedTeams);
        setActiveTeamId(null);
        setLaneCount(savedLanes?.count ?? 1);
        setLaneAssignments(savedLanes?.assignments ?? {});
        setActiveLane(null);
        setLaneScoreFilter("all");
        setSelectedPlayerIds([]);
        setClassFilter(allClasses);
        setStatus("idle");
        setView("scoring");
    }

    function togglePlayer(playerId: string) {
        setSelectedPlayerIds((current) =>
            current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]
        );
    }

    function startRegisteredContest() {
        const registeredPlayers = resetPlayerScores(
            registrationPlayers.filter((player) => selectedPlayerIds.includes(player.id))
        );

        localStorage.setItem(activeContestKey, JSON.stringify({ runId: currentRunId, contestName: competition.name, typeName: contestType.name }));
        localStorage.setItem(`${liveScorePrefix}-${currentRunId}`, JSON.stringify(registeredPlayers));

        setPlayers(registeredPlayers);
        setTeamAssignments([]);
        setActiveTeamId(null);
        setLaneAssignments({});
        setActiveLane(null);
        setLaneScoreFilter("all");
        setClassFilter(allClasses);
        setStatus("idle");
        if (laneCount > 1) {
            setView("lanes");
        } else if (selectedContestTypeIds.includes("team")) {
            setView("teams");
        } else {
            setView("scoring");
        }
    }

    function saveTeamsToStorage(assignments: TeamAssignment[]) {
        const complete = assignments.filter((t) => t.playerIds.length === 4);
        if (complete.length > 0) {
            localStorage.setItem(`${teamsStoragePrefix}-${currentRunId}`, JSON.stringify(complete));
        } else {
            localStorage.removeItem(`${teamsStoragePrefix}-${currentRunId}`);
        }
    }

    function addNewTeam() {
        const n = teamAssignments.length + 1;
        const id = `team-${Date.now()}`;
        const next = [...teamAssignments, { id, name: `Team ${n}`, playerIds: [] }];
        setTeamAssignments(next);
        setActiveTeamId(id);
    }

    function updateTeamName(teamId: string, name: string) {
        setTeamAssignments((current) => current.map((t) => (t.id === teamId ? { ...t, name } : t)));
    }

    function togglePlayerInTeam(playerId: string) {
        if (!activeTeamId) return;
        setTeamAssignments((current) => {
            const next = current.map((team) => {
                if (team.id !== activeTeamId) return team;
                if (team.playerIds.includes(playerId)) {
                    return { ...team, playerIds: team.playerIds.filter((id) => id !== playerId) };
                }
                if (team.playerIds.length >= 4) return team;
                const newPlayerIds = [...team.playerIds, playerId];
                let { name } = team;
                // Auto-name from club when first player is added and name is still the default
                if (newPlayerIds.length === 1) {
                    const teamIndex = current.findIndex((t) => t.id === team.id);
                    if (name === `Team ${teamIndex + 1}`) {
                        const club = registrationPlayers.find((p) => p.id === playerId)?.club || "No club";
                        const sibling = current.filter((t) => t.id !== team.id && t.playerIds.length > 0 && (registrationPlayers.find((p) => p.id === t.playerIds[0])?.club || "No club") === club).length;
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

    function continueFromTeams() {
        saveTeamsToStorage(teamAssignments);
        setView("scoring");
    }

    function saveLanesToStorage(count: number, assignments: Record<string, number>) {
        localStorage.setItem(`${lanesStoragePrefix}-${currentRunId}`, JSON.stringify({ count, assignments }));
    }

    function togglePlayerLane(playerId: string) {
        if (!activeLane) return;
        setLaneAssignments((prev) => {
            const next = { ...prev };
            if (next[playerId] === activeLane) {
                delete next[playerId];
            } else {
                next[playerId] = activeLane;
            }
            saveLanesToStorage(laneCount, next);
            return next;
        });
    }

    function continueFromLanes() {
        saveLanesToStorage(laneCount, laneAssignments);
        setActiveLane(null);
        if (selectedContestTypeIds.includes("team")) {
            setView("teams");
        } else {
            setView("scoring");
        }
    }

    function updateRound(playerId: string, roundIndex: number, value: string) {
        const score = Math.max(0, Math.min(64, Number(value) || 0));

        setPlayers((current) => {
            const next = current.map((player) =>
                player.id === playerId
                    ? { ...player, rounds: player.rounds.map((round, index) => (index === roundIndex ? score : round)) }
                    : player
            );
            localStorage.setItem(`${liveScorePrefix}-${currentRunId}`, JSON.stringify(next));
            return next;
        });
        setStatus("idle");
    }

    function updateSevenMeters(playerId: string, value: string) {
        const sevenMeters = Math.max(0, Number(value) || 0);

        setPlayers((current) => {
            const next = current.map((player) => (player.id === playerId ? { ...player, sevenMeters } : player));
            localStorage.setItem(`${liveScorePrefix}-${currentRunId}`, JSON.stringify(next));
            return next;
        });
        setStatus("idle");
    }

    function saveScores() {
        localStorage.setItem(`${scoreStoragePrefix}-${currentRunId}`, JSON.stringify(players));
        setOldContestIds((current) =>
            current.includes(currentRunId) ? current : [...current, currentRunId]
        );
        setStatus("saved");
    }

    function resetScores() {
        localStorage.removeItem(`${scoreStoragePrefix}-${currentRunId}`);
        localStorage.removeItem(`${liveScorePrefix}-${currentRunId}`);
        localStorage.removeItem(`${teamsStoragePrefix}-${currentRunId}`);
        localStorage.removeItem(`${lanesStoragePrefix}-${currentRunId}`);
        localStorage.removeItem(activeContestKey);
        setPlayers((current) => resetPlayerScores(current));
        setTeamAssignments([]);
        setActiveTeamId(null);
        setLaneAssignments({});
        setActiveLane(null);
        setLaneScoreFilter("all");
        setOldContestIds((current) => current.filter((id) => id !== currentRunId));
        setStatus("reset");
    }

    if (view === "menu") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">Contest</p>
                        <h1>Contest center</h1>
                        <p>Start a new contest or open a saved contest.</p>
                    </div>
                </div>

                <section className="admin-choice-grid" aria-label="Contest choices">
                    <button className="admin-choice-card" type="button" onClick={() => setView("start")}>
                        <span className="admin-choice-icon">
                            <Play size={24} aria-hidden="true" />
                        </span>
                        <span>
                            <strong>Start contest</strong>
                            <span>Choose which contest you want to start.</span>
                        </span>
                        <Play size={20} aria-hidden="true" />
                    </button>

                    <button className="admin-choice-card" type="button" onClick={() => setView("old")}>
                        <span className="admin-choice-icon">
                            <Archive size={24} aria-hidden="true" />
                        </span>
                        <span>
                            <strong>Old contest</strong>
                            <span>Open a contest with scores saved in this browser.</span>
                        </span>
                        <Archive size={20} aria-hidden="true" />
                    </button>
                </section>
            </div>
        );
    }

    if (view === "start") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">Start contest</p>
                        <h1>Choose contest</h1>
                        <p>Select the contest you want to start.</p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("menu")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back
                    </button>
                </div>

                <section className="contest-grid" aria-label="Contest list">
                    {contests.map((contest) => (
                        <button
                            className="contest-card"
                            key={contest.id}
                            type="button"
                            onClick={() => chooseContest(contest.id)}
                        >
                            <span className="contest-card-icon">
                                <Trophy size={20} aria-hidden="true" />
                            </span>
                            <span>{contest.name}</span>
                        </button>
                    ))}
                </section>
            </div>
        );
    }

    if (view === "old") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">Old contest</p>
                        <h1>Saved contests</h1>
                        <p>Select a saved contest to continue scoring.</p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("menu")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back
                    </button>
                </div>

                {oldContests.length > 0 ? (
                    <section className="contest-grid" aria-label="Saved contest list">
                        {oldContests.map((contest) => (
                            <button
                                className="contest-card"
                                key={contest.runId}
                                type="button"
                                onClick={() => openOldContest(contest.runId)}
                            >
                                <span className="contest-card-icon">
                                    <Trophy size={20} aria-hidden="true" />
                                </span>
                                <span>{contest.contest.name} - {contest.type.name}</span>
                            </button>
                        ))}
                    </section>
                ) : (
                    <section className="admin-panel">
                        <div className="panel-title-row">
                            <h2>No old contests</h2>
                            <span className="success-pill">Empty</span>
                        </div>
                        <p>Saved contests will appear here after you start a contest and save scores.</p>
                    </section>
                )}
            </div>
        );
    }

    if (view === "type") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">Start contest</p>
                        <h1>{competition.name}</h1>
                        <p>Choose one or more contest types. Click a selected type again to cancel it.</p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("start")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back
                    </button>
                </div>

                <section className="score-controls contest-registration-actions">
                    <span className="success-pill">{selectedContestTypeIds.length} selected</span>
                    <button
                        className="secondary-action score-button"
                        type="button"
                        disabled={selectedContestTypeIds.length === 0}
                        onClick={clearContestTypes}
                    >
                        Clear
                    </button>
                    <button
                        className="primary-action score-button"
                        type="button"
                        disabled={selectedContestTypeIds.length === 0}
                        onClick={continueWithContestTypes}
                    >
                        Continue
                    </button>
                </section>

                <div className="lane-count-section">
                    <span className="lane-count-label">Lanes</span>
                    <div className="lane-count-picker">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={laneCount === n ? "lane-count-btn active" : "lane-count-btn"}
                                onClick={() => setLaneCount(n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <section className="contest-grid" aria-label="Contest types">
                    {contestTypes.map((type) => (
                        <button
                            className={
                                selectedContestTypeIds.includes(type.id)
                                    ? "contest-card selected"
                                    : "contest-card"
                            }
                            key={type.id}
                            type="button"
                            aria-pressed={selectedContestTypeIds.includes(type.id)}
                            onClick={() => toggleContestType(type.id)}
                        >
                            <span className="contest-card-icon">
                                <Trophy size={20} aria-hidden="true" />
                            </span>
                            <span>{type.name}</span>
                        </button>
                    ))}
                </section>
            </div>
        );
    }

    if (view === "teams") {
        const activePlayerList = registrationPlayers.filter((p) => selectedPlayerIds.includes(p.id));
        const assignedIds = new Set(teamAssignments.flatMap((t) => t.playerIds));
        const clubs = [...new Set(activePlayerList.map((p) => p.club || "No club"))].sort();
        const activeTeam = teamAssignments.find((t) => t.id === activeTeamId) ?? null;
        const activeTeamFull = (activeTeam?.playerIds.length ?? 0) >= 4;

        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">Team setup</p>
                        <h1>{competition.name}</h1>
                        <p>{teamAssignments.filter((t) => t.playerIds.length === 4).length} complete team{teamAssignments.filter((t) => t.playerIds.length === 4).length !== 1 ? "s" : ""}. Click a team card to select it, then pick players.</p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("registration")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back
                    </button>
                </div>

                <section className="score-controls">
                    <button className="secondary-action score-button" type="button" onClick={addNewTeam}>
                        + Add team
                    </button>
                    <button className="primary-action score-button" type="button" onClick={continueFromTeams}>
                        Continue to scoring
                    </button>
                </section>

                {teamAssignments.length === 0 ? (
                    <p className="form-message">Click "+ Add team" to start building teams.</p>
                ) : (
                    <div className="team-slot-row">
                        {teamAssignments.map((team) => {
                            const isActive = team.id === activeTeamId;
                            const isComplete = team.playerIds.length === 4;
                            return (
                                <div
                                    key={team.id}
                                    className={["team-slot-card", isActive ? "is-active" : "", isComplete ? "is-complete" : ""].filter(Boolean).join(" ")}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setActiveTeamId(team.id)}
                                    onKeyDown={(e) => e.key === "Enter" && setActiveTeamId(team.id)}
                                >
                                    <div className="team-slot-card-header">
                                        <input
                                            className="team-name-input"
                                            value={team.name}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updateTeamName(team.id, e.target.value)}
                                            aria-label="Team name"
                                        />
                                        <button
                                            className="team-slot-remove"
                                            type="button"
                                            aria-label={`Remove ${team.name}`}
                                            onClick={(e) => { e.stopPropagation(); removeTeam(team.id); }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <ol className="team-slot-list">
                                        {[0, 1, 2, 3].map((i) => {
                                            const pid = team.playerIds[i];
                                            const name = pid ? activePlayerList.find((p) => p.id === pid)?.name : null;
                                            return (
                                                <li key={i} className={name ? "filled" : "empty"}>
                                                    {name ?? "—"}
                                                    {pid && (
                                                        <button
                                                            type="button"
                                                            className="team-slot-unassign"
                                                            aria-label={`Remove ${name}`}
                                                            onClick={(e) => { e.stopPropagation(); togglePlayerInTeam(pid); setActiveTeamId(team.id); }}
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ol>
                                    {isComplete && <span className="team-complete-badge">Complete</span>}
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTeamId && (
                    <>
                        <p className="team-pick-label">
                            Picking players for <strong>{activeTeam?.name}</strong> — {activeTeam?.playerIds.length ?? 0} / 4 selected
                        </p>
                        {clubs.map((club) => {
                            const clubPlayers = activePlayerList.filter((p) => (p.club || "No club") === club);
                            return (
                                <section key={club} className="team-club-section">
                                    <h3 className="team-club-title">{club}</h3>
                                    <div className="team-player-grid">
                                        {clubPlayers.map((player) => {
                                            const inActiveTeam = activeTeam?.playerIds.includes(player.id) ?? false;
                                            const inOtherTeam = !inActiveTeam && assignedIds.has(player.id);
                                            const otherTeam = inOtherTeam ? teamAssignments.find((t) => t.playerIds.includes(player.id)) : null;
                                            return (
                                                <button
                                                    key={player.id}
                                                    type="button"
                                                    className={["team-player-card", inActiveTeam ? "is-pending" : "", inOtherTeam ? "is-assigned" : ""].filter(Boolean).join(" ")}
                                                    disabled={inOtherTeam || (activeTeamFull && !inActiveTeam)}
                                                    onClick={() => togglePlayerInTeam(player.id)}
                                                >
                                                    <span className="team-player-name">{player.name}</span>
                                                    <span className="team-player-meta">Class {player.classLevel} · {player.ageCategory}</span>
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

    if (view === "lanes") {
        const activePlayerList = registrationPlayers.filter((p) => selectedPlayerIds.includes(p.id));
        const clubs = [...new Set(activePlayerList.map((p) => p.club || "No club"))].sort();
        const lanes = Array.from({ length: laneCount }, (_, i) => i + 1);

        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">Lane assignment</p>
                        <h1>{competition.name}</h1>
                        <p>
                            {Object.keys(laneAssignments).length} of {activePlayerList.length} players assigned.
                            Click a lane, then tap players to place them.
                        </p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("registration")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back
                    </button>
                </div>

                <section className="score-controls">
                    <button className="primary-action score-button" type="button" onClick={continueFromLanes}>
                        Continue
                    </button>
                </section>

                <div className="lane-selector-row" role="group" aria-label="Select lane">
                    {lanes.map((lane) => {
                        const count = activePlayerList.filter((p) => laneAssignments[p.id] === lane).length;
                        return (
                            <button
                                key={lane}
                                type="button"
                                className={activeLane === lane ? "lane-chip active" : "lane-chip"}
                                onClick={() => setActiveLane(activeLane === lane ? null : lane)}
                            >
                                Lane {lane}
                                <span className="lane-chip-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                {activeLane ? (
                    <>
                        <p className="team-pick-label">
                            Placing players on <strong>Lane {activeLane}</strong>
                        </p>
                        {clubs.map((club) => {
                            const clubPlayers = activePlayerList.filter((p) => (p.club || "No club") === club);
                            return (
                                <section key={club} className="team-club-section">
                                    <h3 className="team-club-title">{club}</h3>
                                    <div className="team-player-grid">
                                        {clubPlayers.map((player) => {
                                            const playerLane = laneAssignments[player.id];
                                            const onActive = playerLane === activeLane;
                                            const onOther = playerLane !== undefined && !onActive;
                                            return (
                                                <button
                                                    key={player.id}
                                                    type="button"
                                                    className={["team-player-card", onActive ? "is-pending" : "", onOther ? "is-assigned" : ""].filter(Boolean).join(" ")}
                                                    onClick={() => togglePlayerLane(player.id)}
                                                >
                                                    <span className="team-player-name">{player.name}</span>
                                                    <span className="team-player-meta">Class {player.classLevel} · {player.ageCategory}</span>
                                                    {playerLane && <span className="team-badge">Lane {playerLane}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </>
                ) : (
                    <p className="form-message">Select a lane above to start placing players.</p>
                )}
            </div>
        );
    }

    if (view === "registration") {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <div>
                        <p className="eyebrow">Player registration</p>
                        <h1>{competition.name}</h1>
                        <p>
                            Register players for {contestType.name}. Selected: {selectedPlayerIds.length}
                        </p>
                    </div>
                    <button className="secondary-action roster-back-button" type="button" onClick={() => setView("type")}>
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back
                    </button>
                </div>

                <section className="score-controls contest-registration-actions">
                    <button
                        className="secondary-action score-button"
                        type="button"
                        onClick={() => setSelectedPlayerIds((prev) => {
                            const toAdd = filteredRegistrationPlayers.map((p) => p.id).filter((id) => !prev.includes(id));
                            return [...prev, ...toAdd];
                        })}
                    >
                        Select all
                    </button>
                    <button
                        className="secondary-action score-button"
                        type="button"
                        onClick={() => setSelectedPlayerIds([])}
                    >
                        Clear
                    </button>
                    <button
                        className="primary-action score-button"
                        type="button"
                        disabled={selectedPlayerIds.length === 0}
                        onClick={startRegisteredContest}
                    >
                        Start with registered players
                    </button>
                </section>

                <div className="club-filter-bar" role="group" aria-label="Filter by club">
                    <button
                        className={clubFilter === "all" ? "club-filter-chip active" : "club-filter-chip"}
                        type="button"
                        onClick={() => setClubFilter("all")}
                    >
                        All clubs
                        <span className="club-chip-count">{registrationPlayers.length}</span>
                    </button>
                    {registrationClubs.map((club) => {
                        const clubPlayers = registrationPlayers.filter((p) => (p.club || "No club") === club);
                        const selectedInClub = clubPlayers.filter((p) => selectedPlayerIds.includes(p.id)).length;
                        return (
                            <button
                                className={clubFilter === club ? "club-filter-chip active" : "club-filter-chip"}
                                key={club}
                                type="button"
                                onClick={() => setClubFilter(clubFilter === club ? "all" : club)}
                            >
                                {club}
                                <span className="club-chip-count">
                                    {selectedInClub > 0 ? `${selectedInClub}/` : ""}{clubPlayers.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="table-shell">
                    <table>
                        <thead>
                            <tr>
                                <th>Join</th>
                                <th>Name</th>
                                {clubFilter === "all" && <th>Club</th>}
                                <th>Class</th>
                                <th>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRegistrationPlayers.map((player) => (
                                <tr key={player.id}>
                                    <td>
                                        <input
                                            aria-label={`Register ${player.name}`}
                                            checked={selectedPlayerIds.includes(player.id)}
                                            type="checkbox"
                                            onChange={() => togglePlayer(player.id)}
                                        />
                                    </td>
                                    <td>{player.name}</td>
                                    {clubFilter === "all" && <td>{player.club || "No team"}</td>}
                                    <td>Class {player.classLevel}</td>
                                    <td>{player.ageCategory}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-page-header startlist-no-print">
                <div>
                    <p className="eyebrow">Scoring</p>
                    <h1>{competition.name}</h1>
                    <p>
                        {contestType.name} with {players.length} registered players.
                    </p>
                </div>
                <button className="secondary-action roster-back-button" type="button" onClick={() => setView("menu")}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    Contest center
                </button>
            </div>

            <section className="score-controls startlist-no-print">
                <label>
                    Class
                    <select
                        value={classFilter}
                        onChange={(event) =>
                            setClassFilter(
                                event.target.value === allClasses ? allClasses : (Number(event.target.value) as ClassLevel)
                            )
                        }
                    >
                        <option value={allClasses}>All classes</option>
                        <option value={1}>Class 1</option>
                        <option value={2}>Class 2</option>
                        <option value={3}>Class 3</option>
                        <option value={4}>Class 4</option>
                    </select>
                </label>

                {laneCount > 1 && (
                    <label>
                        Lane
                        <select
                            value={laneScoreFilter}
                            onChange={(e) => setLaneScoreFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                        >
                            <option value="all">All lanes</option>
                            {Array.from({ length: laneCount }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>Lane {n}</option>
                            ))}
                        </select>
                    </label>
                )}

                <button className="secondary-action score-button startlist-no-print" type="button" onClick={() => window.print()}>
                    <Printer size={17} aria-hidden="true" />
                    Print start list
                </button>
                <button className="secondary-action score-button startlist-no-print" type="button" onClick={resetScores}>
                    <RotateCcw size={17} aria-hidden="true" />
                    Reset
                </button>
                <button className="primary-action score-button" type="button" onClick={saveScores}>
                    <Save size={17} aria-hidden="true" />
                    Save scores
                </button>
            </section>

            {status !== "idle" && (
                <p className="form-message startlist-no-print">
                    {status === "saved"
                        ? `Scores saved for ${competition.name} - ${contestType.name}.`
                        : `Scores reset for ${competition.name} - ${contestType.name}.`}
                </p>
            )}

            {/* Print-only start list */}
            <div className="startlist-print-only">
                <div className="startlist-print-header">
                    <h1>{competition.name}</h1>
                    <p>{contestType.name} · {players.length} players</p>
                </div>
                {laneCount > 1
                    ? Array.from({ length: laneCount }, (_, i) => i + 1).map((lane) => {
                        const lanePlayers = players.filter((p) => laneAssignments[p.id] === lane);
                        return (
                            <section key={lane} className="startlist-group">
                                <h2>Lane {lane}</h2>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Club</th>
                                            <th>Class</th>
                                            {Array.from({ length: 10 }, (_, i) => <th key={i}>R{i + 1}</th>)}
                                            <th>1–5</th>
                                            <th>6–10</th>
                                            <th>Total</th>
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
                                <h2>Class {cl}</h2>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Club</th>
                                            {Array.from({ length: 10 }, (_, i) => <th key={i}>R{i + 1}</th>)}
                                            <th>1–5</th>
                                            <th>6–10</th>
                                            <th>Total</th>
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
                            <th>Player</th>
                            {Array.from({ length: 10 }, (_, index) => (
                                <th key={index}>R{index + 1}</th>
                            ))}
                            {hasTies && <th>7m</th>}
                            <th>1-5</th>
                            <th>6-10</th>
                            <th>Total</th>
                            <th>Rank</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scoringRows.map((player) => (
                            <tr key={player.id}>
                                <td>
                                    <strong>{player.name}</strong>
                                    <span>{player.club} · Class {player.classLevel}</span>
                                </td>
                                {player.rounds.map((round, index) => (
                                    <td key={`${player.id}-${index}`}>
                                        <input
                                            aria-label={`${player.name} round ${index + 1}`}
                                            inputMode="numeric"
                                            min={0}
                                            max={64}
                                            type="number"
                                            value={round}
                                            onChange={(event) => updateRound(player.id, index, event.target.value)}
                                        />
                                    </td>
                                ))}
                                {hasTies && (
                                    <td>
                                        {tiedTotals.has(player.total) ? (
                                            <input
                                                aria-label={`${player.name} 7-meter tie-break`}
                                                inputMode="numeric"
                                                min={0}
                                                type="number"
                                                value={player.sevenMeters}
                                                onChange={(event) => updateSevenMeters(player.id, event.target.value)}
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
                    <h2>Competition summary</h2>
                    <span className="success-pill">{contestType.name}</span>
                </div>
                <p>
                    Editing values recalculates totals immediately. Saving stores this contest's scores in this browser
                    so you can return to them from Old contest.
                </p>
            </section>
        </div>
    );
}
