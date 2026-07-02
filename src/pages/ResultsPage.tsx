import { samplePlayers } from "../data/sampleCompetition";
import { getSecondChancePlayers, rankPlayers } from "../lib/scoring";

export default function ResultsPage() {
    const rankings = rankPlayers(samplePlayers);
    const secondChance = getSecondChancePlayers(samplePlayers, 4);

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">Results</p>
                    <h1>Rankings and points</h1>
                    <p>Ranking is sorted by total score, then 7-meter tie-break, then name.</p>
                </div>
            </div>

            <div className="table-shell">
                <table>
                    <thead>
                        <tr>
                            <th>Place</th>
                            <th>Player</th>
                            <th>Club</th>
                            <th>Total</th>
                            <th>7m</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankings.map((player) => (
                            <tr key={player.id}>
                                <td>{player.rank}</td>
                                <td>{player.name}</td>
                                <td>{player.club}</td>
                                <td>{player.total}</td>
                                <td>{player.sevenMeters}</td>
                                <td>{player.rankingPoints}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <section className="admin-panel">
                <div className="panel-title-row">
                    <h2>Andra chansen, class 4</h2>
                    <span className="success-pill">{secondChance.length} selected</span>
                </div>
                <p>{secondChance.map((player) => player.name).join(", ")}</p>
            </section>
        </div>
    );
}
