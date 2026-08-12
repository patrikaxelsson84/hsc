import type { PlayerScore } from "./scoring";

// ── shared helpers ────────────────────────────────────────────────────────────

function openPrint(title: string, body: string, lang: string): void {
    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;margin:0;padding:8mm;font-size:11px;color:#000}
.ph{display:flex;align-items:center;gap:12px;margin-bottom:12px;border-bottom:2px solid #000;padding-bottom:8px}
.ph h1{font-size:18px;margin:0;line-height:1.2}
.ph p{margin:3px 0 0;font-size:12px;color:#333;font-weight:bold}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}
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
    body{padding:6mm}
    @page{margin:6mm;size:A4 portrait}
}
</style>
</head>
<body>
${body}
<script>window.onload=function(){window.print()}</script>
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
    const banaLabel = lang === "sv" ? "Bana" : "Lane";

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

    const tables = laneGroups.map(({ laneNum, players: lp }) => {
        const rows = lp.length > 0
            ? lp.map((p) => `<tr><td class="nc">${p.name}</td><td></td><td></td><td></td><td></td><td></td><td class="sc"></td></tr>`).join("")
            : Array.from({ length: 5 }, () => `<tr><td class="nc"></td><td></td><td></td><td></td><td></td><td></td><td class="sc"></td></tr>`).join("");
        return `<div class="lb"><table>
            <thead>
                <tr><th colspan="7" class="lh">${banaLabel} ${laneNum}</th></tr>
                <tr><th class="nt">Namn</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>Summa</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table></div>`;
    }).join("");

    openPrint(`${competitionName} – Domarprotokoll`, `
<div class="ph"><div><h1>${competitionName}</h1><p>Domarprotokoll</p></div></div>
<div class="grid">${tables}</div>`, lang);
}

// ── Startordning ──────────────────────────────────────────────────────────────

interface PrintStartordningParams {
    competitionName: string;
    players: PlayerScore[];
    laneAssignments: Record<string, number>;
    laneCount: number;
    laneFilter?: number | "all";
    lang?: string;
}

export function printStartordning({
    competitionName,
    players,
    laneAssignments,
    laneCount,
    laneFilter = "all",
    lang = "sv",
}: PrintStartordningParams): void {
    const hasLanes = laneCount > 1 && Object.keys(laneAssignments).length > 0;
    const banaLabel  = lang === "sv" ? "Bana"   : "Lane";
    const klassLabel = lang === "sv" ? "Klass"  : "Class";
    const klubbLabel = lang === "sv" ? "Klubb"  : "Club";

    const laneGroups: { laneNum: number; players: PlayerScore[] }[] = [];
    if (hasLanes) {
        const lanesToShow = laneFilter !== "all"
            ? [laneFilter as number]
            : Array.from({ length: laneCount }, (_, i) => i + 1);
        for (const lane of lanesToShow) {
            laneGroups.push({ laneNum: lane, players: players.filter((p) => laneAssignments[p.id] === lane) });
        }
    } else {
        laneGroups.push({ laneNum: 0, players });
    }

    const tables = laneGroups.map(({ laneNum, players: lp }) => {
        const header = laneNum > 0
            ? `<tr><th colspan="4" class="lh">${banaLabel} ${laneNum}</th></tr>`
            : "";
        const rows = lp.map((p, i) => `
            <tr>
                <td class="num">${i + 1}</td>
                <td class="nc">${p.name}</td>
                <td>${p.club || "–"}</td>
                <td>${p.classLevel}</td>
            </tr>`).join("");
        return `<div class="lb"><table>
            <thead>
                ${header}
                <tr><th class="num">#</th><th class="nt">Namn</th><th>${klubbLabel}</th><th>${klassLabel}</th></tr>
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
            const rows = members.map((p) => `
                <tr>
                    <td class="nc">${p.name}</td>
                    <td>${p.club || "–"}</td>
                    <td>${p.classLevel}</td>
                </tr>`).join("");
            return `<div class="team-block">
                <div class="team-name">${team.name}</div>
                <table>
                    <thead><tr><th class="nt">Namn</th><th>${klubbLabel}</th><th>${klassLabel}</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        }).join("");

    openPrint(`${competitionName} – Laguppställning`, `
<div class="ph"><div><h1>${competitionName}</h1><p>Laguppställning</p></div></div>
<div class="grid single">${blocks}</div>`, lang);
}
