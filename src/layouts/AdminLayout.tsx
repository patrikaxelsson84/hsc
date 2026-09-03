import { ArrowLeft, Lock, LogIn, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Outlet } from "react-router-dom";
import LangSelect from "../components/LangSelect";
import AppSidebar from "../components/AppSidebar";
import Topbar from "../components/Topbar";
import { useLanguage } from "../lib/language";
import { checkAdminPassword } from "../lib/auth";

const ADMIN_SESSION_KEY = "hsc-admin-session";

function isAdminLoggedIn(): boolean {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
    const { t } = useLanguage();
    const [password, setPassword] = useState("");
    const [error,    setError]    = useState(false);
    const [loading,  setLoading]  = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        if (await checkAdminPassword(password)) {
            sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
            onLogin();
        } else {
            setError(true);
            setPassword("");
        }
        setLoading(false);
    }

    return (
        <main className="public-page">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="HSC home">
                    <span className="brand-mark">HSC</span>
                    <span>{t.brand_subtitle}</span>
                </Link>
                <a className="svhkf-logo-link" href="https://www.svhkf.se/" target="_blank" rel="noopener noreferrer">
                    <img className="svhkf-logo" src="/svhkf-logo.png" alt="Sv HKF" />
                </a>
                <LangSelect />
            </header>

            <div className="club-login-shell">
                <div className="club-login-card">
                    <div className="club-login-icon"><ShieldCheck size={28} /></div>
                    <p className="eyebrow">{t.admin_login_eyebrow}</p>
                    <h1>{t.admin_login_heading}</h1>
                    <p className="club-login-desc">{t.admin_login_desc}</p>

                    <form className="club-login-form" onSubmit={handleSubmit}>
                        <label>
                            {t.admin_login_pass}
                            <div className="club-login-field">
                                <Lock size={16} aria-hidden="true" />
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    placeholder="••••••••"
                                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                                />
                            </div>
                        </label>
                        {error && <p className="club-login-error">{t.admin_login_error}</p>}
                        <button className="primary-action club-login-btn" type="submit" disabled={loading}>
                            <LogIn size={18} aria-hidden="true" />
                            {loading ? "…" : t.admin_login_btn}
                        </button>
                    </form>

                    <Link className="back-link club-login-back" to="/">
                        <ArrowLeft size={15} aria-hidden="true" />
                        {t.club_back}
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default function AdminLayout() {
    const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn);

    function handleLogout() {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setLoggedIn(false);
    }

    if (!loggedIn) {
        return <AdminLogin onLogin={() => setLoggedIn(true)} />;
    }

    return (
        <div className="admin-shell">
            <AppSidebar />
            <div className="admin-main">
                <Topbar onLogout={handleLogout} />
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
