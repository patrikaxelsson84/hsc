import { Bell } from "lucide-react";

export default function Topbar() {
    return (
        <header className="topbar">
            <div>
                <div>
                    <h2>
                        Competition Manager
                    </h2>
                </div>

                <div className="topbar-actions">
                    <button className="icon-button" type="button" aria-label="Notifications">
                        <Bell size={18} />
                    </button>

                    <div className="user-chip">
                        <div className="avatar" />

                        <div>
                            <p>
                                Admin
                            </p>

                            <span>
                                Tournament Director
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
