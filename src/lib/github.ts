const token = import.meta.env.VITE_GITHUB_TOKEN as string | undefined;
const owner = import.meta.env.VITE_GITHUB_OWNER as string | undefined;
const repo  = import.meta.env.VITE_GITHUB_REPO  as string | undefined;

export const isConfigured = Boolean(token && owner && repo);

function apiHeaders(): HeadersInit {
    const h: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
}

function b64decode(str: string): string {
    const binary = atob(str.replace(/\n/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

function b64encode(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
}

export interface GithubFile {
    content: string;
    sha: string;
}

export async function getFile(path: string): Promise<GithubFile> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
    const data = (await res.json()) as { content: string; sha: string };
    return { content: b64decode(data.content), sha: data.sha };
}

export async function putFile(
    path: string,
    content: string,
    sha: string | undefined,
    message: string,
): Promise<void> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const body: Record<string, string> = { message, content: b64encode(content) };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
        method: "PUT",
        headers: { ...(apiHeaders() as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub ${res.status} on PUT ${path}`);
}
