import { supabase } from "./supabase";

export type ChangeType = "add" | "edit" | "delete";
export type ChangeStatus = "pending" | "approved" | "rejected";

export interface PlayerData {
    id: string;
    name: string;
    club: string;
    classLevel: number;
    ageCategory: string;
}

export interface PendingChange {
    id: string;
    change_type: ChangeType;
    player_id: string;
    player_name: string;
    club_name: string;
    old_data: PlayerData | null;
    new_data: PlayerData | null;
    created_at: string;
    status: ChangeStatus;
}

export async function submitPendingChange(
    change: Omit<PendingChange, "id" | "created_at" | "status">
): Promise<void> {
    await supabase.from("pending_player_changes").insert(change);
}

export async function loadPendingChanges(): Promise<PendingChange[]> {
    const { data } = await supabase
        .from("pending_player_changes")
        .select("*")
        .eq("status", "pending")
        .order("created_at");
    return (data ?? []) as PendingChange[];
}

export async function loadRejectedAddIds(clubName: string): Promise<Set<string>> {
    const { data } = await supabase
        .from("pending_player_changes")
        .select("player_id")
        .eq("club_name", clubName)
        .eq("change_type", "add")
        .eq("status", "rejected");
    return new Set((data ?? []).map((r: { player_id: string }) => r.player_id));
}

export async function loadResolvedDeleteChanges(clubName: string): Promise<{ approvedIds: Set<string>; rejectedIds: Set<string> }> {
    const { data } = await supabase
        .from("pending_player_changes")
        .select("player_id, status")
        .eq("club_name", clubName)
        .eq("change_type", "delete")
        .in("status", ["approved", "rejected"]);
    const approvedIds = new Set<string>();
    const rejectedIds = new Set<string>();
    for (const r of (data ?? []) as { player_id: string; status: string }[]) {
        if (r.status === "approved") approvedIds.add(r.player_id);
        else rejectedIds.add(r.player_id);
    }
    return { approvedIds, rejectedIds };
}

export async function resolveChange(id: string, status: "approved" | "rejected"): Promise<void> {
    await supabase.from("pending_player_changes").update({ status }).eq("id", id);
}

export async function applyAndApprove(change: PendingChange): Promise<void> {
    if (change.change_type === "delete") {
        await supabase.from("players").delete().eq("id", change.player_id);
    } else if (change.change_type === "edit" && change.new_data) {
        await supabase.from("players").update({
            name:         change.new_data.name,
            club:         change.new_data.club,
            class_level:  change.new_data.classLevel,
            age_category: change.new_data.ageCategory,
        }).eq("id", change.player_id);
    } else if (change.change_type === "add" && change.new_data) {
        const newId = `player-${Date.now()}`;
        await supabase.from("players").insert({
            id:           newId,
            name:         change.new_data.name,
            club:         change.new_data.club,
            class_level:  change.new_data.classLevel,
            age_category: change.new_data.ageCategory,
        });
    }
    await resolveChange(change.id, "approved");
}
