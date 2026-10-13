import { ArrowLeft, BookOpen, ChevronDown, Download, FileText, Image } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/language";

const SVHKF = "https://www.svhkf.se";

function AccordionItem({ title, accent, accentBg, points, tiebreaker, labelHow, labelTiebreak }: {
    title: string;
    accent: string;
    accentBg: string;
    points: string[];
    tiebreaker: string[];
    labelHow: string;
    labelTiebreak: string;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="regler-accordion" style={{ "--acc-accent": accent, "--acc-bg": accentBg } as React.CSSProperties}>
            <button className="regler-accordion-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                <span className="regler-acc-dot" />
                <span className="regler-acc-title">{title}</span>
                <ChevronDown size={16} className={`regler-acc-chevron ${open ? "open" : ""}`} />
            </button>
            {open && (
                <div className="regler-accordion-body">
                    <div className="regler-acc-section">
                        <p className="regler-acc-label">{labelHow}</p>
                        <ul className="regler-acc-list">
                            {points.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </div>
                    <div className="regler-acc-section">
                        <p className="regler-acc-label">{labelTiebreak}</p>
                        <ol className="regler-acc-list ordered">
                            {tiebreaker.map((tb, i) => <li key={i}>{tb}</li>)}
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ReglerPage() {
    const { t } = useLanguage();

    const documents = [
        { title: t.regler_d1_title, desc: t.regler_d1_desc, url: `${SVHKF}/Doc/Regelboken.pdf`,                         icon: FileText, tag: "PDF" },
        { title: t.regler_d2_title, desc: t.regler_d2_desc, url: `${SVHKF}/Doc/Infofolder_SvHKF.pdf`,                   icon: FileText, tag: "PDF" },
        { title: t.regler_d3_title, desc: t.regler_d3_desc, url: `${SVHKF}/Doc/Regler_bild.pdf`,                        icon: Image,    tag: "PDF" },
        { title: t.regler_d4_title, desc: t.regler_d4_desc, url: `${SVHKF}/Doc/Sweden_Grand_Prix_2021_2022.xlsm`,       icon: FileText, tag: "XLS" },
        { title: t.regler_d5_title, desc: t.regler_d5_desc, url: `${SVHKF}/Doc/regler_uttagning_Sweden_Masters.pdf`,    icon: FileText, tag: "PDF" },
    ];

    const competitionRules = [
        {
            key: "sverigeranking",
            title: t.regler_r1_title,
            accent: "#10b981", accentBg: "#d1fae5",
            points: [t.regler_r1_p1, t.regler_r1_p2, t.regler_r1_p3],
            tiebreaker: [t.regler_r1_tb1, t.regler_r1_tb2, t.regler_r1_tb3, t.regler_r1_tb4],
        },
        {
            key: "bonusjakten",
            title: t.regler_r2_title,
            accent: "#f59e0b", accentBg: "#fef3c7",
            points: [t.regler_r2_p1, t.regler_r2_p2, t.regler_r2_p3, t.regler_r2_p4],
            tiebreaker: [t.regler_r2_tb1, t.regler_r2_tb2, t.regler_r2_tb3],
        },
        {
            key: "seriespelsranking",
            title: t.regler_r3_title,
            accent: "#3b82f6", accentBg: "#dbeafe",
            points: [t.regler_r3_p1, t.regler_r3_p2, t.regler_r3_p3],
            tiebreaker: [t.regler_r3_tb1, t.regler_r3_tb2],
        },
    ];

    return (
        <div className="public-page regler-page">
            <nav className="guestbook-nav">
                <Link to="/" className="guestbook-back">
                    <ArrowLeft size={16} /> {t.regler_back}
                </Link>
            </nav>

            <header className="guestbook-header">
                <span className="guestbook-icon" style={{ background: "#d1fae5", color: "#059669" }}>
                    <BookOpen size={28} />
                </span>
                <div>
                    <p className="eyebrow">{t.regler_eyebrow}</p>
                    <h1>{t.regler_heading}</h1>
                    <p className="guestbook-subtitle">{t.regler_subtitle}</p>
                </div>
            </header>

            <section className="regler-section">
                <h2 className="regler-section-title">
                    <Download size={17} /> {t.regler_docs_heading}
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

            <section className="regler-section">
                <h2 className="regler-section-title">
                    <BookOpen size={17} /> {t.regler_format_heading}
                </h2>
                <p className="regler-section-desc">{t.regler_format_desc}</p>
                <div className="regler-accordions">
                    {competitionRules.map((rule) => (
                        <AccordionItem
                            key={rule.key}
                            title={rule.title}
                            accent={rule.accent}
                            accentBg={rule.accentBg}
                            points={rule.points}
                            tiebreaker={rule.tiebreaker}
                            labelHow={t.regler_how}
                            labelTiebreak={t.regler_tiebreak}
                        />
                    ))}
                </div>
            </section>

            <p className="regler-source">
                {t.regler_source} <a href="https://www.svhkf.se/regler/" target="_blank" rel="noopener noreferrer">svhkf.se/regler</a>
            </p>
        </div>
    );
}
