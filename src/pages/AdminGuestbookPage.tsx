import { MessageSquare, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Entry {
    id: string;
    name: string;
    message: string;
    created_at: string;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("sv-SE", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function AdminGuestbookPage() {
    const [entries,  setEntries]  = useState<Entry[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        supabase
            .from("guestbook_entries")
            .select("*")
            .order("created_at", { ascending: false })
            .then(({ data }) => {
                setEntries((data ?? []) as Entry[]);
                setLoading(false);
            });
    }, []);

    async function handleDelete(id: string) {
        setDeleting(id);
        const { error } = await supabase
            .from("guestbook_entries")
            .delete()
            .eq("id", id);
        if (!error) {
            setEntries((prev) => prev.filter((e) => e.id !== id));
        }
        setDeleting(null);
    }

    return (
        <div className="admin-section">
            <div className="admin-section-header">
                <span className="admin-section-icon"><MessageSquare size={20} /></span>
                <h2>Gästbok</h2>
                <span className="admin-section-count">{entries.length} inlägg</span>
            </div>

            {loading && <p className="admin-loading">Laddar…</p>}

            {!loading && entries.length === 0 && (
                <p className="admin-empty">Inga inlägg i gästboken.</p>
            )}

            {!loading && entries.length > 0 && (
                <div className="gb-admin-list">
                    {entries.map((e) => (
                        <div key={e.id} className="gb-admin-entry">
                            <div className="gb-admin-meta">
                                <strong className="gb-admin-name">{e.name}</strong>
                                <time className="gb-admin-time">{fmtDate(e.created_at)}</time>
                            </div>
                            <p className="gb-admin-message">{e.message}</p>
                            <button
                                className="gb-admin-delete"
                                title="Ta bort inlägg"
                                disabled={deleting === e.id}
                                onClick={() => handleDelete(e.id)}
                            >
                                <Trash2 size={15} />
                                {deleting === e.id ? "Tar bort…" : "Ta bort"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
