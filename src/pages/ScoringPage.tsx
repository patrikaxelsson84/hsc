import { ArrowLeft, Archive, Play, RotateCcw, Save, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { samplePlayers } from "../data/sampleCompetition";
import type { ClassLevel, PlayerScore } from "../lib/scoring";
import { rankPlayers } from "../lib/scoring";

const allClasses = "all";
const scoreStoragePrefix = "hsc-scores-v3";
const typeIdSeparator = "+";
type ClassFilter = ClassLevel | typeof allClasses;
type ContestView = "menu" | "start" | "type" | "registration" | "old" | "scoring";

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
        return samplePlayers;
    }

    try {
        return JSON.parse(stored) as PlayerScore[];
    } catch {
        return samplePlayers;
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
    const [classFilter, setClassFilter] = useState<ClassFilter>(allClasses);
    const [players, setPlayers] = useState<PlayerScore[]>(samplePlayers);
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
            [...samplePlayers].sort(
                (firstPlayer, secondPlayer) =>
                    firstPlayer.club.localeCompare(secondPlayer.club) ||
                    firstPlayer.classLevel - secondPlayer.classLevel ||
                    firstPlayer.name.localeCompare(secondPlayer.name)
            ),
        []
    );
    const visiblePlayers = useMemo(
        () =>
            classFilter === allClasses
                ? players
                : players.filter((player) => player.classLevel === classFilter),
        [classFilter, players]
    );
    const rankings = rankPlayers(visiblePlayers);

    function chooseContest(nextCompetitionId: string) {
        setCompetitionId(nextCompetitionId);
        setSelectedContestTypeIds([]);
        setContestTypeId("");
        setSelectedPlayerIds([]);
        setClassFilter(allClasses);
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
        setPlayers([]);
        setClassFilter(allClasses);
        setStatus("idle");
        setView("registration");
    }

    function openOldContest(runId: string) {
        const [nextCompetitionId, nextContestTypeId] = runId.split("__");
        const nextSelection = parseTypeSelection(nextContestTypeId);

        setCompetitionId(nextCompetitionId);
        setSelectedContestTypeIds(nextSelection.ids);
        setContestTypeId(nextSelection.id);
        setPlayers(getStoredScores(runId));
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

        setPlayers(registeredPlayers);
        setClassFilter(allClasses);
        setStatus("idle");
        setView("scoring");
    }

    function updateRound(playerId: string, roundIndex: number, value: string) {
        const score = Math.max(0, Math.min(64, Number(value) || 0));

        setPlayers((current) =>
            current.map((player) =>
                player.id === playerId
                    ? {
                          ...player,
                          rounds: player.rounds.map((round, index) => (index === roundIndex ? score : round)),
                      }
                    : player
            )
        );
        setStatus("idle");
    }

    function updateSevenMeters(playerId: string, value: string) {
        const sevenMeters = Math.max(0, Number(value) || 0);

        setPlayers((current) =>
            current.map((player) => (player.id === playerId ? { ...player, sevenMeters } : player))
        );
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
        setPlayers((current) => resetPlayerScores(current));
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
                        onClick={() => setSelectedPlayerIds(registrationPlayers.map((player) => player.id))}
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

                <div className="table-shell">
                    <table>
                        <thead>
                            <tr>
                                <th>Join</th>
                                <th>Name</th>
                                <th>Club</th>
                                <th>Class</th>
                                <th>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrationPlayers.map((player) => (
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
                                    <td>{player.club || "No team"}</td>
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
            <div className="admin-page-header">
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

            <section className="score-controls">
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

                <button className="secondary-action score-button" type="button" onClick={resetScores}>
                    <RotateCcw size={17} aria-hidden="true" />
                    Reset
                </button>
                <button className="primary-action score-button" type="button" onClick={saveScores}>
                    <Save size={17} aria-hidden="true" />
                    Save scores
                </button>
            </section>

            {status !== "idle" && (
                <p className="form-message">
                    {status === "saved"
                        ? `Scores saved for ${competition.name} - ${contestType.name}.`
                        : `Scores reset for ${competition.name} - ${contestType.name}.`}
                </p>
            )}

            <div className="score-entry-shell">
                <table>
                    <thead>
                        <tr>
                            <th>Player</th>
                            {Array.from({ length: 10 }, (_, index) => (
                                <th key={index}>R{index + 1}</th>
                            ))}
                            <th>7m</th>
                            <th>1-5</th>
                            <th>6-10</th>
                            <th>Total</th>
                            <th>Rank</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankings.map((player) => (
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
                                <td>
                                    <input
                                        aria-label={`${player.name} 7-meter tie-break`}
                                        inputMode="numeric"
                                        min={0}
                                        type="number"
                                        value={player.sevenMeters}
                                        onChange={(event) => updateSevenMeters(player.id, event.target.value)}
                                    />
                                </td>
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

            <section className="admin-panel">
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
