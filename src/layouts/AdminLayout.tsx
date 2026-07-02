import { Outlet } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import Topbar from "../components/Topbar";

export default function AdminLayout() {
    return (
        <div className="admin-shell">
            <AppSidebar />

            <div className="admin-main">
                <Topbar />
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
