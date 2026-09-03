import { useRef, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "../lib/language";

const options = [
    { code: "sv" as const, flag: "🇸🇪", label: "Svenska" },
    { code: "en" as const, flag: "🇬🇧", label: "English" },
    { code: "pl" as const, flag: "🇵🇱", label: "Polski" },
];

export default function LangSelect() {
    const { lang, setLang } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const current = options.find((o) => o.code === lang)!;

    return (
        <div className="lang-select" ref={ref}>
            <button
                className="lang-trigger"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className="lang-flag">{current.flag}</span>
                <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={`lang-chevron${open ? " open" : ""}`}
                />
            </button>

            {open && (
                <ul className="lang-menu" role="listbox">
                    {options.map((o) => (
                        <li key={o.code} role="option" aria-selected={o.code === lang}>
                            <button
                                type="button"
                                className={o.code === lang ? "active" : ""}
                                onClick={() => {
                                    setLang(o.code);
                                    setOpen(false);
                                }}
                            >
                                <span>{o.flag}</span>
                                <span>{o.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
