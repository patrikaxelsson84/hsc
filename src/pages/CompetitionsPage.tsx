import { CalendarDays, CheckCircle2 } from "lucide-react";
import { currentCompetition } from "../data/sampleCompetition";

export default function CompetitionsPage() {
    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="eyebrow">Competition</p>
                    <h1>{currentCompetition.name}</h1>
                    <p>Competition settings that drive registration and result calculations.</p>
                </div>
            </div>

            <section className="admin-panel settings-grid">
                <div>
                    <CalendarDays size={22} />
                    <span>Date</span>
                    <strong>{currentCompetition.date}</strong>
                </div>
                <div>
                    <span className="small-mark">HSC</span>
                    <span>Point table</span>
                    <strong>Ranking</strong>
                </div>
                <div>
                    <CheckCircle2 size={22} />
                    <span>Registration</span>
                    <strong>{currentCompetition.registrationOpen ? "Open" : "Closed"}</strong>
                </div>
            </section>
        </div>
    );
}
