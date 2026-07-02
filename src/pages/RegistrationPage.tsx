import { ArrowLeft, Check, Send } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";

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
                        Email
                        <input name="email" type="email" autoComplete="email" required />
                    </label>

                    <div className="field-grid">
                        <label>
                            Club
                            <input name="club" type="text" placeholder="Club name" required />
                        </label>
                        <label>
                            Category
                            <select name="category" required defaultValue="">
                                <option value="" disabled>
                                    Select category
                                </option>
                                <option value="open">Open</option>
                                <option value="junior">Junior</option>
                                <option value="senior">Senior</option>
                                <option value="team">Team</option>
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
