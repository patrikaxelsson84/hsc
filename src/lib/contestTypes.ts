export const contestTypeDefs: { id: string; sv: string; en: string }[] = [
    { id: "mixed",           sv: "Mixed",       en: "Mixed" },
    { id: "dubbel",          sv: "Dubbel",      en: "Double" },
    { id: "team",            sv: "Lag",         en: "Team" },
    { id: "mr",              sv: "Herr",        en: "Mr." },
    { id: "mrs",             sv: "Dam",         en: "Mrs." },
    { id: "junior",          sv: "Junior",      en: "Junior" },
    { id: "minions",         sv: "Minorer",     en: "Minions" },
    { id: "mr-double",       sv: "Herrdubbel",  en: "Mr. Double" },
    { id: "mrs-double",      sv: "Damdubbel",   en: "Mrs. Double" },
    { id: "individual-rank", sv: "Individuell", en: "Individual Rank" },
];

export function typeLabel(id: string, lang: string): string {
    const def = contestTypeDefs.find((d) => d.id === id);
    return def ? (lang === "sv" ? def.sv : def.en) : id;
}

export function typeName(ids: string[], lang: string): string {
    return ids.map((id) => typeLabel(id, lang)).join(" + ");
}

export function typeNameFromRunId(runId: string, lang: string): string {
    const typeIdPart = runId.split("__").slice(1).join("__");
    const ids = typeIdPart.split("+").filter(Boolean);
    return typeName(ids, lang);
}
