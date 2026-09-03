import { NavLink } from "react-router-dom";
import {
    Home,
    Users,
    Trophy,
    ClipboardList,
    Target,
    BarChart3,
    ShieldCheck,
} from "lucide-react";
import { useLanguage } from "../lib/language";

export default function AppSidebar() {
    const { t } = useLanguage();

    const menuItems = [
        { title: t.menu_dashboard,    icon: Home,          path: "/admin" },
        { title: t.menu_players,      icon: Users,         path: "/admin/players" },
        { title: t.menu_competitions, icon: Trophy,        path: "/admin/competitions" },
        { title: t.menu_registration, icon: ClipboardList, path: "/admin/registration" },
        { title: t.menu_contest,      icon: Target,        path: "/admin/scoring" },
        { title: t.menu_results,      icon: BarChart3,     path: "/admin/results" },
        { title: t.menu_users,        icon: ShieldCheck,   path: "/admin/users" },
    ];

    return (
        <aside className="w-72 border-r bg-white">
            <div className="h-16 flex items-center px-6 border-b">
                <div>
                    <h1 className="admin-sidebar-title">Resultatservice</h1>
                    <p className="admin-sidebar-subtitle">{t.sidebar_subtitle}</p>
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
