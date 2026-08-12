export const storageKey = "hsc-competitions-v2";

export interface Competition {
    id: string;
    name: string;
    date: string;
    organizer: string;
    location: string;
    ranking: boolean;
    registrationOpen: boolean;
    source: "manual" | "svhkf";
}

const seedCompetitions: Omit<Competition, "id" | "registrationOpen">[] = [
    { name: "Tingsryd Open",         date: "2026-05-16", organizer: "Tingsryd Hsc",   location: "Kurorten",                    ranking: true,  source: "svhkf" },
    { name: "Smålandsmästaren ute",  date: "2026-05-16", organizer: "Tingsryd Hsc",   location: "Kurorten",                    ranking: true,  source: "svhkf" },
    { name: "Björkenäs Open",        date: "2026-05-30", organizer: "Lanternan",       location: "Björkenäs camping",           ranking: true,  source: "svhkf" },
    { name: "Jämjö Open",            date: "2026-05-31", organizer: "Jämjö Hsk",      location: "Björkenäs camping",           ranking: true,  source: "svhkf" },
    { name: "Sweden Masters",        date: "2026-06-12", organizer: "SvHKF",           location: "Hovmantorp",                  ranking: false, source: "svhkf" },
    { name: "Inoff SM utomhus",      date: "2026-06-13", organizer: "Växjö",           location: "Gökaskratts Camping",         ranking: true,  source: "svhkf" },
    { name: "SibbamålaMästerskapet", date: "2026-06-27", organizer: "Sibbamåla If",   location: "Sibbamåla hembygdspark",      ranking: false, source: "svhkf" },
    { name: "Blekinge DM ute",       date: "2026-08-01", organizer: "Lanternan Hsk",  location: "Björkenäs Camping",           ranking: true,  source: "svhkf" },
    { name: "Lilltorp Open",         date: "2026-08-08", organizer: "Balders Hsk",    location: "Lilltorp Arena, Rådmansö",    ranking: true,  source: "svhkf" },
    { name: "Roslagen Open",         date: "2026-08-09", organizer: "Viby Hsk",       location: "Lilltorp Arena, Rådmansö",    ranking: true,  source: "svhkf" },
    { name: "Wezet Open",            date: "2026-08-15", organizer: "Wezet Hsk",      location: "Vislanda",                    ranking: true,  source: "svhkf" },
    { name: "Dynapac Open",          date: "2026-08-29", organizer: "Dynapac Hsk",    location: "Dragsö Camping",              ranking: true,  source: "svhkf" },
    { name: "Viby Open",             date: "2026-09-12", organizer: "Viby Hsk",       location: "4H Bögs gård",                ranking: true,  source: "svhkf" },
    { name: "Svealand DM ute",       date: "2026-09-12", organizer: "Viby Hsk",       location: "4H Bögs gård",                ranking: true,  source: "svhkf" },
    { name: "Växjö Open",            date: "2026-09-19", organizer: "Växjö Hsk",      location: "Växjö boulehall",             ranking: true,  source: "svhkf" },
    { name: "Höstskon",              date: "2026-10-03", organizer: "Korpen Nybro",   location: "Korpcentrum, Nybro",          ranking: true,  source: "svhkf" },
    { name: "Carlskrona Cup",        date: "2026-10-17", organizer: "Carlskrona Hsc", location: "Rosenholm Boulearena",        ranking: true,  source: "svhkf" },
    { name: "Sibbamåla Open",        date: "2026-11-14", organizer: "Sibbamåla If",   location: "Rosenholm Boulearena",        ranking: true,  source: "svhkf" },
    { name: "Julhandikappen",        date: "2027-01-01", organizer: "Tingsryd Hsc",   location: "Kurorten, Tingsryd",          ranking: false, source: "svhkf" },
    { name: "Svealand DM inne",      date: "2027-01-01", organizer: "",               location: "",                            ranking: true,  source: "svhkf" },
    { name: "Smålands DM inne",      date: "2027-01-01", organizer: "",               location: "",                            ranking: true,  source: "svhkf" },
    { name: "Blekinge DM inne",      date: "2027-01-01", organizer: "",               location: "Rosenholm Boulearena",        ranking: true,  source: "svhkf" },
    { name: "Värendspokalen",        date: "2027-04-10", organizer: "Värends Hsk",    location: "Växjö boulehall",             ranking: true,  source: "svhkf" },
    { name: "Inoff SM inomhus",      date: "2027-04-24", organizer: "Dyna X",         location: "Rosenholm",                   ranking: true,  source: "svhkf" },
];

export function initCompetitions() {
    if (!localStorage.getItem(storageKey)) {
        const seeded = seedCompetitions.map((c, i) => ({
            ...c,
            id: `svhkf-${i}`,
            registrationOpen: true,
        }));
        localStorage.setItem(storageKey, JSON.stringify(seeded));
    }
}

export function loadCompetitions(): Competition[] {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw);
    } catch { /* empty */ }
    return [];
}

export function saveCompetitions(list: Competition[]) {
    localStorage.setItem(storageKey, JSON.stringify(list));
}
