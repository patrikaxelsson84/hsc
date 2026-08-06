import { Bell } from "lucide-react";
import { useLanguage } from "../lib/language";
import LangSelect from "./LangSelect";

export default function Topbar() {
    const { t } = useLanguage();

    return (
        <header className="topbar">
            <div>
                <div>
                    <h2>{t.topbar_title}</h2>
                </div>

                <div className="topbar-actions">
                    <LangSelect />

                    <button
                        className="icon-button"
                        type="button"
                        aria-label={t.topbar_notifications}
                    >
                        <Bell size={18} />
                    </button>

                    <div className="user-chip">
                        <div className="avatar" />
                        <div>
                            <p>Admin</p>
                            <span>{t.topbar_role}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
