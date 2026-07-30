import { ArrowLeft, Check, Send } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { samplePlayers } from "../data/sampleCompetition";

const clubOptions = [...new Set(samplePlayers.map((p) => p.club).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
);

type RegistrationStatus = "idle" | "submitted";

export default function RegistrationPage() {
    const [status, setStatus] = useState<RegistrationStatus>("idle");
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith("/admin");

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const entry = Object.fromEntries(formData.entries());
        const existing = JSON.parse(localStorage.getItem("hsc-registrations") ?? "[]") as unknown[];

        localStorage.setItem(
            "hsc-registrations",
            JSON.stringify([...existing, { ...entry, createdAt: new Date().toISOString() }])
        );

        setStatus("submitted");
        event.currentTarget.reset();
    }

    return (
        <main className="registration-page">
            <section className="registration-shell">
                <div className="registration-intro">
                    <Link className="back-link" to="/">
                        <ArrowLeft size={17} aria-hidden="true" />
                        {isAdminRoute ? "Public home" : "Home"}
                    </Link>

                    <p className="eyebrow">Player registration</p>
                    <h1>Register for the next HSC competition.</h1>
                    <p>
                        Submit player details now so organizers can confirm categories, clubs, and
                        score sheets before the event starts.
                    </p>

                    <div className="registration-points">
                        <span>
                            <Check size={18} aria-hidden="true" />
                            Confirmation handled by the organizer
                        </span>
                        <span>
                            <Check size={18} aria-hidden="true" />
                            Supports singles and team entries
                        </span>
                        <span>
                            <Check size={18} aria-hidden="true" />
                            Contact details kept with the event roster
                        </span>
                    </div>
                </div>

                <form className="registration-form" onSubmit={handleSubmit}>
                    <div className="form-header">
                        <div>
                            <p className="panel-kicker">Entry form</p>
                            <h2>Competition details</h2>
                        </div>
                        {status === "submitted" && <span className="success-pill">Received</span>}
                    </div>

                    <div className="field-grid">
                        <label>
                            First name
                            <input name="firstName" type="text" autoComplete="given-name" required />
                        </label>
                        <label>
                            Last name
                            <input name="lastName" type="text" autoComplete="family-name" required />
                        </label>
                    </div>

                    <label>
                        Email <span className="field-optional">(optional)</span>
                        <input name="email" type="email" autoComplete="email" />
                    </label>

                    <div className="field-grid">
                        <label>
                            Club
                            <input
                                name="club"
                                type="text"
                                placeholder="Type to search..."
                                list="club-options"
                                autoComplete="off"
                                required
                            />
                            <datalist id="club-options">
                                {clubOptions.map((club) => (
                                    <option key={club} value={club} />
                                ))}
                            </datalist>
                        </label>
                        <label>
                            Class
                            <select name="category" required defaultValue="">
                                <option value="" disabled>
                                    Select class
                                </option>
                                <option value="1">Class 1</option>
                                <option value="2">Class 2</option>
                                <option value="3">Class 3</option>
                                <option value="4">Class 4</option>
                            </select>
                        </label>
                        <label>
                            Title
                            <select name="title" required defaultValue="">
                                <option value="" disabled>
                                    Select title
                                </option>
                                <option value="mr">Mr.</option>
                                <option value="mrs">Mrs.</option>
                                <option value="junior">Junior</option>
                                <option value="minior">Minior</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        Notes
                        <textarea
                            name="notes"
                            rows={4}
                            placeholder="Partner, accessibility needs, or scheduling notes"
                        />
                    </label>

                    <button className="primary-action form-submit" type="submit">
                        Submit registration
                        <Send size={18} aria-hidden="true" />
                    </button>

                    {status === "submitted" && (
                        <p className="form-message">
                            Registration saved in this browser. You can connect it to Supabase when
                            the event API is ready.
                        </p>
                    )}
                </form>
            </section>
        </main>
    );
}
