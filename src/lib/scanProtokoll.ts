const EDGE_URL   = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/scan-protokoll`;
const SCAN_TOKEN = import.meta.env.VITE_SCAN_TOKEN as string;

// ── Shared ────────────────────────────────────────────────────────────────────

export interface RegisteredPlayer { id: string; name: string }

/** Resize to max 1600 px on the long side and encode as JPEG. */
export async function compressImage(
    file: File,
    maxSide = 500,
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload  = () => resolve(el);
        el.onerror = reject;
        el.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);

    const scale  = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width  = Math.round(img.naturalWidth  * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const [, base64] = dataUrl.split(",");
    return { base64, mediaType: "image/jpeg" };
}

// ── Old format (backward compat for ClubPage) ─────────────────────────────────

export interface RecognizedScore {
    name: string;
    rounds: number[];
    bonusRounds: boolean[];
}

/** Drop-in replacement for the old browser-side extractScoresFromImage. Now calls the server. */
export async function extractScoresFromImage(
    imageDataUrl: string,
    players: RegisteredPlayer[],
): Promise<RecognizedScore[]> {
    const [header, base64] = imageDataUrl.split(",");
    const mediaType = (header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg") as string;

    const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${SCAN_TOKEN}`,
        },
        body: JSON.stringify({ format: "resultatkort", image: base64, mediaType, registeredPlayers: players }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err?.error ?? `Serverfel ${res.status}`);
    }

    const data = await res.json() as { players?: RecognizedScore[] };
    return data.players ?? [];
}

// ── New domarprotokoll format (for ScoringPage) ───────────────────────────────

export interface ScanRow {
    namn: string;
    kast: number[];
    angiven_summa: number | null;
    osaker: boolean;
    beraknad_summa: number;
    avvikelse: boolean;
    ogiltig_kast: boolean;
    matchad_id: string | null;
    matchat_namn: string | null;
    flaggad: boolean;
    flaggorsak: string | null;
}

export interface ScanResult {
    omgang: number;
    bana: number;
    players: ScanRow[];
}

export async function scanProtokoll(
    base64: string,
    mediaType: string,
    players: RegisteredPlayer[],
): Promise<ScanResult> {
    const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${SCAN_TOKEN}`,
        },
        body: JSON.stringify({ format: "domarprotokoll", image: base64, mediaType, registeredPlayers: players }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err?.error ?? `Serverfel ${res.status}`);
    }

    return res.json() as Promise<ScanResult>;
}
