import type { PlayerScore } from "./scoring";

// ── shared helpers ────────────────────────────────────────────────────────────

function openPrint(title: string, body: string, lang: string, extraStyles = ""): void {
    const printLabel = lang === "sv" ? "Skriv ut" : "Print";
    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;margin:0;padding:10mm;font-size:11px;color:#000}
.toolbar{display:flex;gap:8px;margin-bottom:10px}
.toolbar button{padding:6px 16px;font-size:13px;cursor:pointer;border:1px solid #555;border-radius:4px;background:#eee}
.toolbar button:hover{background:#ddd}
.ph{display:flex;align-items:center;gap:12px;margin-bottom:12px;border-bottom:2px solid #000;padding-bottom:8px}
.ph h1{font-size:18px;margin:0;line-height:1.2}
.ph p{margin:3px 0 0;font-size:12px;color:#333;font-weight:bold}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 14px}
.lb{break-inside:avoid}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #555;padding:2px 4px;text-align:center;min-width:20px}
th{background:#d8d8ee;font-size:10px}
.lh{background:#b0b0d8;text-align:left;padding-left:6px;font-size:11px;font-weight:bold}
.nt,.nc{text-align:left;min-width:80px}
.nc{height:18px;font-size:10px;width:40%}
.sc{background:#f2f2f2}
.num{width:22px;color:#666}
.single{max-width:600px}
.team-block{break-inside:avoid;margin-bottom:14px}
.team-name{font-weight:bold;font-size:12px;background:#b0b0d8;padding:3px 6px;border:1px solid #555;border-bottom:none}
@media print{
    .toolbar{display:none}
    body{padding:6mm}
}
${extraStyles}
</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">${printLabel}</button></div>
${body}
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
}

// ── Domarprotokoll ────────────────────────────────────────────────────────────

interface PrintProtokollParams {
    competitionName: string;
    typeName: string;
    players: PlayerScore[];
    laneAssignments: Record<string, number>;
    laneCount: number;
    laneFilter?: number | "all";
    lang?: string;
}

export function printProtokoll({
    competitionName,
    players,
    laneAssignments,
    laneCount,
    laneFilter = "all",
    lang = "sv",
}: PrintProtokollParams): void {
    const hasLanes = laneCount > 1 && Object.keys(laneAssignments).length > 0;
    const banaLabel  = lang === "sv" ? "Bana"    : "Lane";
    const skoLabel   = lang === "sv" ? "Sko"     : "Shoe";
    const namnLabel  = lang === "sv" ? "Namn"    : "Name";
    const summaLabel = lang === "sv" ? "Summa"   : "Total";
    const omgLabel   = lang === "sv" ? "Omgång:" : "Round:";
    const numRows    = 20;
    const numRounds  = 10;

    const laneGroups: { laneNum: number; players: PlayerScore[] }[] = [];
    if (hasLanes) {
        const lanesToShow = laneFilter !== "all"
            ? [laneFilter as number]
            : Array.from({ length: laneCount }, (_, i) => i + 1);
        for (const lane of lanesToShow) {
            laneGroups.push({ laneNum: lane, players: players.filter((p) => laneAssignments[p.id] === lane) });
        }
    } else {
        laneGroups.push({ laneNum: 1, players });
    }

    const pages: string[] = [];
    for (const { laneNum, players: lp } of laneGroups) {
        const filledRows = lp.map((p, i) =>
            `<tr class="proto-row"><td class="proto-nr">${i + 1}</td><td class="proto-name">${p.name}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
        );
        const emptyCount = Math.max(0, numRows - filledRows.length);
        const emptyRows  = Array.from({ length: emptyCount }, (_, i) =>
            `<tr class="proto-row"><td class="proto-nr">${filledRows.length + i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
        );
        const rows = [...filledRows, ...emptyRows].join("");

        for (let round = 1; round <= numRounds; round++) {
            const isLast = laneGroups[laneGroups.length - 1].laneNum === laneNum && round === numRounds;
            pages.push(`<div class="proto-page" style="page-break-after:${isLast ? "avoid" : "always"}">
<div class="proto-header">
  <span class="proto-comp">${competitionName}</span>
  <span class="proto-omg">${omgLabel} <span class="proto-omg-num">${round}</span></span>
</div>
<table class="proto-table">
    <thead>
        <tr>
            <th colspan="2" class="proto-th-bana">${banaLabel} ${laneNum}</th>
            <th class="proto-th">${skoLabel}</th>
            <th class="proto-th">${skoLabel}</th>
            <th class="proto-th">${skoLabel}</th>
            <th class="proto-th">${skoLabel}</th>
            <th class="proto-th">${skoLabel}</th>
            <th class="proto-th"></th>
        </tr>
        <tr>
            <th class="proto-th proto-nr">Nr</th>
            <th class="proto-th proto-th-name">${namnLabel}</th>
            <th class="proto-th">1</th><th class="proto-th">2</th><th class="proto-th">3</th><th class="proto-th">4</th><th class="proto-th">5</th>
            <th class="proto-th">${summaLabel}</th>
        </tr>
    </thead>
    <tbody>${rows}</tbody>
</table></div>`);
        }
    }

    const protoStyles = `
@page{size:A4 portrait;margin:10mm}
body{padding:0 !important}
.proto-page{width:190mm;min-height:277mm;page-break-after:always}
.proto-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3mm}
.proto-comp{font-size:13px;font-weight:bold;color:#000}
.proto-omg{font-size:12px;color:#000}
.proto-omg-num{border:2px solid #000;padding:1px 8px;font-size:24px;font-weight:bold;margin-left:4px;color:#000;display:inline-block;line-height:1}
.proto-table{border-collapse:collapse;width:100%;table-layout:fixed}
.proto-row{height:12mm}
.proto-th{border:1px solid #000;text-align:center;font-size:11px;background:#fff !important;padding:2px;color:#000}
.proto-th-bana{border:1px solid #000;text-align:left;padding-left:4px;font-size:12px;font-weight:bold;background:#fff !important;color:#000}
.proto-th-name{text-align:left;padding-left:4px;color:#c00 !important}
.proto-table td{border:1px solid #000;padding:2px;text-align:center;font-size:12px;color:#000}
.proto-nr{width:24px;text-align:center}
.proto-name{text-align:left;padding-left:4px;width:40%}
@media print{.toolbar{display:none}body{padding:0 !important}}`;

    openPrint(`${competitionName} – Domarprotokoll`, pages.join(""), lang, protoStyles);
}

// ── Startordning ──────────────────────────────────────────────────────────────

interface PrintStartordningParams {
    competitionName: string;
    players: PlayerScore[];
    laneAssignments: Record<string, number>;
    laneCount: number;
    teamAssignments?: { id: string; name: string; playerIds: string[] }[];
    laneFilter?: number | "all";
    lang?: string;
}

export function printStartordning({
    competitionName,
    players,
    laneAssignments,
    laneCount,
    teamAssignments = [],
    laneFilter = "all",
    lang = "sv",
}: PrintStartordningParams): void {
    const hasLanes = laneCount > 1 && Object.keys(laneAssignments).length > 0;
    const banaLabel  = lang === "sv" ? "Bana"   : "Lane";
    const klassLabel = lang === "sv" ? "Klass"  : "Class";
    const klubbLabel = lang === "sv" ? "Klubb"  : "Club";
    const lagLabel   = lang === "sv" ? "Lag"    : "Team";

    const playerMap = new Map(players.map((p) => [p.id, p]));

    // Build throwing-order map: playerId → position within their team (0-indexed)
    const teamPositionMap = new Map<string, number>();
    const playerTeamMap   = new Map<string, string>(); // playerId → teamName
    for (const t of teamAssignments) {
        t.playerIds.forEach((id, pos) => {
            teamPositionMap.set(id, pos);
            playerTeamMap.set(id, t.name);
        });
    }

    // Sort players within a lane: team members first in throwing order, then individuals
    function sortLanePlayers(lp: PlayerScore[]): PlayerScore[] {
        return [...lp].sort((a, b) => {
            const pa = teamPositionMap.get(a.id) ?? 999;
            const pb = teamPositionMap.get(b.id) ?? 999;
            return pa - pb;
        });
    }

    const laneGroups: { laneNum: number; players: PlayerScore[] }[] = [];
    if (hasLanes) {
        const lanesToShow = laneFilter !== "all"
            ? [laneFilter as number]
            : Array.from({ length: laneCount }, (_, i) => i + 1);
        for (const lane of lanesToShow) {
            const lp = players.filter((p) => laneAssignments[p.id] === lane);
            laneGroups.push({ laneNum: lane, players: sortLanePlayers(lp) });
        }
    } else {
        laneGroups.push({ laneNum: 0, players: sortLanePlayers(players) });
    }

    const tables = laneGroups.map(({ laneNum, players: lp }) => {
        const header = laneNum > 0
            ? `<tr><th colspan="5" class="lh">${banaLabel} ${laneNum}</th></tr>`
            : "";
        const rows = lp.map((p, i) => {
            const teamName = playerTeamMap.get(p.id);
            const teamCell = teamName ? `<td style="color:#555;font-size:9px">${lagLabel}: ${teamName}</td>` : `<td></td>`;
            return `<tr>
                <td class="num">${i + 1}</td>
                <td class="nc">${p.name}</td>
                <td>${p.club || "–"}</td>
                <td>${p.classLevel}</td>
                ${teamCell}
            </tr>`;
        }).join("");
        return `<div class="lb"><table>
            <thead>
                ${header}
                <tr><th class="num">#</th><th class="nt">Namn</th><th>${klubbLabel}</th><th>${klassLabel}</th><th></th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table></div>`;
    }).join("");

    openPrint(`${competitionName} – Startordning`, `
<div class="ph"><div><h1>${competitionName}</h1><p>Startordning</p></div></div>
<div class="grid">${tables}</div>`, lang);
}

// ── Laguppställning ───────────────────────────────────────────────────────────

interface PrintLaguppställningParams {
    competitionName: string;
    players: PlayerScore[];
    teamAssignments: { id: string; name: string; playerIds: string[] }[];
    lang?: string;
}

export function printLaguppställning({
    competitionName,
    players,
    teamAssignments,
    lang = "sv",
}: PrintLaguppställningParams): void {
    const klassLabel = lang === "sv" ? "Klass" : "Class";
    const klubbLabel = lang === "sv" ? "Klubb" : "Club";
    const noTeams    = lang === "sv" ? "Inga lag skapade." : "No teams created.";

    const playerMap = new Map(players.map((p) => [p.id, p]));
    const complete  = teamAssignments.filter((t) => t.playerIds.length > 0);

    const blocks = complete.length === 0
        ? `<p>${noTeams}</p>`
        : complete.map((team) => {
            const members = team.playerIds.map((id) => playerMap.get(id)).filter(Boolean) as PlayerScore[];
            const rows = members.map((p, i) => `
                <tr>
                    <td class="num">${i + 1}</td>
                    <td class="nc">${p.name}</td>
                    <td>${p.club || "–"}</td>
                    <td>${p.classLevel}</td>
                </tr>`).join("");
            return `<div class="lb"><table>
                <thead>
                    <tr><th colspan="4" class="lh">${team.name}</th></tr>
                    <tr><th class="num">#</th><th class="nt">Namn</th><th>${klubbLabel}</th><th>${klassLabel}</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table></div>`;
        }).join("");

    openPrint(`${competitionName} – Laguppställning`, `
<div class="ph"><div><h1>${competitionName}</h1><p>Laguppställning</p></div></div>
<div class="grid">${blocks}</div>`, lang);
}
