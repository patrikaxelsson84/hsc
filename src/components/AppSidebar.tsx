import { NavLink } from "react-router-dom";
import {
    Home,
    Users,
    Trophy,
    ClipboardList,
    Target,
    BarChart3,
    FileText,
    Settings,
} from "lucide-react";

const menuItems = [
    {
        title: "Dashboard",
        icon: Home,
        path: "/admin",
    },
    {
        title: "Players",
        icon: Users,
        path: "/admin/players",
    },
    {
        title: "Competitions",
        icon: Trophy,
        path: "/admin/competitions",
    },
    {
        title: "Registration",
        icon: ClipboardList,
        path: "/admin/registration",
    },
    {
        title: "Contest",
        icon: Target,
        path: "/admin/scoring",
    },
    {
        title: "Results",
        icon: BarChart3,
        path: "/admin/results",
    },
    {
        title: "Reports",
        icon: FileText,
        path: "/reports",
    },
    {
        title: "Settings",
        icon: Settings,
        path: "/settings",
    },
];

export default function AppSidebar() {
    return (
        <aside className="w-72 border-r bg-white">
            <div className="h-16 flex items-center px-6 border-b">
                <div>
                    <h1 className="admin-sidebar-title">
                        Resultatservice
                    </h1>

                    <p className="admin-sidebar-subtitle">
                        Competition System
                    </p>
                </div>
            </div>

            <nav className="p-4 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                isActive ? "sidebar-link active" : "sidebar-link"
                            }
                        >
                            <Icon size={18} />
                            {item.title}
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}
