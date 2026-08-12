export type ClassLevel = 1 | 2 | 3 | 4;
export type AgeCategory = "minior" | "junior" | "herr" | "dam";

export interface PlayerScore {
    id: string;
    name: string;
    club: string;
    classLevel: ClassLevel;
    ageCategory: AgeCategory;
    rounds: number[];
    sevenMeters: number;
}

export interface RankedPlayer extends PlayerScore {
    firstHalf: number;
    secondHalf: number;
    total: number;
    rank: number;
    rankingPoints: number;
    bonusPoints: number;
}

const rankingPointTable = [20, 18, 16, 14, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

const bonusTargets = new Set([15, 19, 31, 32, 35, 36, 44, 48, 49, 53, 57, 58, 60, 61, 64]);

export function sumRounds(rounds: number[], start: number, end: number) {
    return rounds.slice(start, end).reduce((total, score) => total + score, 0);
}

export function calculateBonusPoints(rounds: number[]) {
    return rounds.filter((score) => bonusTargets.has(score)).length * 5;
}

export function getRankingPoints(rank: number, participantCount: number) {
    if (participantCount <= 0 || rank > participantCount) {
        return 0;
    }

    return rankingPointTable[rank - 1] ?? 0;
}

export function rankPlayers(players: PlayerScore[]): RankedPlayer[] {
    const sorted = players
        .map((player) => ({
            ...player,
            firstHalf: sumRounds(player.rounds, 0, 5),
            secondHalf: sumRounds(player.rounds, 5, 10),
            total: sumRounds(player.rounds, 0, 10),
            rank: 0,
            rankingPoints: 0,
            bonusPoints: calculateBonusPoints(player.rounds),
        }))
        .sort((a, b) => b.total - a.total || b.sevenMeters - a.sevenMeters || a.name.localeCompare(b.name));

    return sorted.map((player, index, list) => {
        const previous = list[index - 1];
        const rank =
            previous && previous.total === player.total && previous.sevenMeters === player.sevenMeters
                ? previous.rank
                : index + 1;

        return {
            ...player,
            rank,
            rankingPoints: getRankingPoints(rank, list.length),
        };
    });
}

export function filterByClass(players: PlayerScore[], classLevel: ClassLevel) {
    return players.filter((player) => player.classLevel === classLevel);
}

export function getSecondChancePlayers(players: PlayerScore[], classLevel: ClassLevel, limit = 6) {
    return rankPlayers(filterByClass(players, classLevel))
        .slice()
        .sort((a, b) => a.total - b.total || a.sevenMeters - b.sevenMeters || a.name.localeCompare(b.name))
        .slice(0, limit);
}

export interface TeamAssignment {
    id: string;
    name: string;
    playerIds: string[];
}

export interface TeamResult {
    id: string;
    name: string;
    players: RankedPlayer[];
    total: number;
    rank: number;
}

export function rankTeams(players: PlayerScore[], assignments: TeamAssignment[]): TeamResult[] {
    if (assignments.length === 0) return [];

    const teams = assignments
        .map((team) => {
            const teamPlayers = team.playerIds
                .map((id) => players.find((p) => p.id === id))
                .filter((p): p is PlayerScore => p !== undefined);
            return {
                id: team.id,
                name: team.name,
                players: rankPlayers(teamPlayers),
                total: teamPlayers.reduce((sum, p) => sum + sumRounds(p.rounds, 0, 10), 0),
                rank: 0,
            };
        })
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    return teams.map((team, index, list) => {
        const previous = list[index - 1];
        const rank = previous && previous.total === team.total ? previous.rank : index + 1;
        return { ...team, rank };
    });
}
