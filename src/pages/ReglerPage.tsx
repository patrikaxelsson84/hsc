import { ArrowLeft, BookOpen, ChevronDown, Download, FileText, Image } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const SVHKF = "https://www.svhkf.se";

const documents = [
    {
        title: "Regelbok",
        desc: "Fullständiga officiella tävlingsregler (SvHKF 2020)",
        url: `${SVHKF}/Doc/Regelboken.pdf`,
        icon: FileText,
        tag: "PDF",
    },
    {
        title: "Infofolder med regler",
        desc: "Kompakt sammanfattning av regler för nybörjare och besökare",
        url: `${SVHKF}/Doc/Infofolder_SvHKF.pdf`,
        icon: FileText,
        tag: "PDF",
    },
    {
        title: "Poängberäkning",
        desc: "Illustration som visar hur poängen beräknas per kast",
        url: `${SVHKF}/Doc/Regler_bild.pdf`,
        icon: Image,
        tag: "PDF",
    },
    {
        title: "Regler Sweden Grand Prix",
        desc: "Klassindelning och poängregler för Sweden Grand Prix",
        url: `${SVHKF}/Doc/Sweden_Grand_Prix_2021_2022.xlsm`,
        icon: FileText,
        tag: "XLS",
    },
    {
        title: "Uttagning Sweden Masters",
        desc: "Regler för hur uttagning till Sweden Masters går till",
        url: `${SVHKF}/Doc/regler_uttagning_Sweden_Masters.pdf`,
        icon: FileText,
        tag: "PDF",
    },
];

const competitionRules = [
    {
        key: "sverigeranking",
        title: "Sverigeranking",
        accent: "#10b981",
        accentBg: "#d1fae5",
        points: [
            "Totalpoängen från rankingtävlingar under säsongen räknas ihop per kastare.",
            "Max 12 tävlingar räknas — de 12 med högst resultat väljs ut.",
            "Den med högst totalpoäng när säsongen är slut vinner.",
        ],
        tiebreaker: [
            "Högst snitt per serie.",
            "Högst poäng på en enskild tävling, sedan näst högst osv.",
            "Högst poäng på senaste tävlingen, sedan den dessförinnan osv. (DM-tävlingar räknas ej).",
            "Går det fortfarande inte att skilja dem åt delar de placeringen.",
        ],
    },
    {
        key: "bonusjakten",
        title: "Bonusjakten",
        accent: "#f59e0b",
        accentBg: "#fef3c7",
        points: [
            "Bonus erhålls om man poängsätter alla fem hästskor i samma omgång.",
            "En bonus = 5 bonuspoäng.",
            "Gäller på alla sanktionerade tävlingar. Max 12 tävlingar räknas.",
            "Den med flest bonuspoäng när säsongen är slut vinner.",
        ],
        tiebreaker: [
            "Högst bonuspoäng på en enskild tävling, sedan näst högst osv.",
            "Högst bonuspoäng på senaste tävlingen, sedan den dessförinnan osv. (DM-tävlingar räknas ej).",
            "Går det fortfarande inte att skilja dem åt delar de placeringen.",
        ],
    },
    {
        key: "seriespelsranking",
        title: "Seriespelsranking",
        accent: "#3b82f6",
        accentBg: "#dbeafe",
        points: [
            "Alla individuella seriespelsresultat under säsongen räknas in.",
            "Den med högst snitt när säsongen är slut vinner.",
            "Minst 7 spelade serier krävs för att kunna prissättas (gäller även Sweden Masters-platser).",
        ],
        tiebreaker: [
            "Högsta enskilda serieresultat, sedan näst högsta osv.",
            "Går det fortfarande inte att skilja dem åt delar de placeringen.",
        ],
    },
];

function AccordionItem({ rule }: { rule: typeof competitionRules[0] }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="regler-accordion" style={{ "--acc-accent": rule.accent, "--acc-bg": rule.accentBg } as React.CSSProperties}>
            <button className="regler-accordion-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                <span className="regler-acc-dot" />
                <span className="regler-acc-title">{rule.title}</span>
                <ChevronDown size={16} className={`regler-acc-chevron ${open ? "open" : ""}`} />
            </button>
            {open && (
                <div className="regler-accordion-body">
                    <div className="regler-acc-section">
                        <p className="regler-acc-label">Hur det fungerar</p>
                        <ul className="regler-acc-list">
                            {rule.points.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </div>
                    <div className="regler-acc-section">
                        <p className="regler-acc-label">Vid lika poäng avgörs det av</p>
                        <ol className="regler-acc-list ordered">
                            {rule.tiebreaker.map((t, i) => <li key={i}>{t}</li>)}
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ReglerPage() {
    return (
        <div className="public-page regler-page">
            <nav className="guestbook-nav">
                <Link to="/" className="guestbook-back">
                    <ArrowLeft size={16} /> Tillbaka till startsidan
                </Link>
            </nav>

            <header className="guestbook-header">
                <span className="guestbook-icon" style={{ background: "#d1fae5", color: "#059669" }}>
                    <BookOpen size={28} />
                </span>
                <div>
                    <p className="eyebrow">REGLER</p>
                    <h1>Regler</h1>
                    <p className="guestbook-subtitle">Officiella tävlingsregler för hästskokastning — utgivna av Svenska HästskoKastarFörbundet (SvHKF).</p>
                </div>
            </header>

            {/* Documents */}
            <section className="regler-section">
                <h2 className="regler-section-title">
                    <Download size={17} /> Dokument
                </h2>
                <div className="regler-docs-grid">
                    {documents.map((doc) => {
                        const Icon = doc.icon;
                        return (
                            <a
                                key={doc.url}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="regler-doc-card"
                            >
                                <span className="regler-doc-icon"><Icon size={20} /></span>
                                <div className="regler-doc-body">
                                    <span className="regler-doc-title">{doc.title}</span>
                                    <span className="regler-doc-desc">{doc.desc}</span>
                                </div>
                                <span className="regler-doc-tag">{doc.tag}</span>
                            </a>
                        );
                    })}
                </div>
            </section>

            {/* Competition rules */}
            <section className="regler-section">
                <h2 className="regler-section-title">
                    <BookOpen size={17} /> Tävlingsformat
                </h2>
                <p className="regler-section-desc">Regler för ranking och specialtävlingar under säsongen.</p>
                <div className="regler-accordions">
                    {competitionRules.map((rule) => (
                        <AccordionItem key={rule.key} rule={rule} />
                    ))}
                </div>
            </section>

            <p className="regler-source">
                Källa: <a href="https://www.svhkf.se/regler/" target="_blank" rel="noopener noreferrer">svhkf.se/regler</a>
            </p>
        </div>
    );
}
