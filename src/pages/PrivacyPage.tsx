import { Link } from "react-router-dom";
import { useLanguage } from "../lib/language";

type Section = { heading: string; body: string | string[] };
type PolicyContent = { title: string; updated: string; sections: Section[] };

const policy: Record<"en" | "sv" | "pl", PolicyContent> = {
    en: {
        title: "Privacy Policy",
        updated: "Last updated: September 2026",
        sections: [
            {
                heading: "1. Who we are",
                body: "HSC – Hästskokastarklubben (\"we\", \"us\") operates www.hscontest.se, a competition management system for horseshoe throwing clubs affiliated with Svenska Hästskokastarförbundet (SvHKF). We are the data controller for personal data processed through this service.",
            },
            {
                heading: "2. What data we collect and why",
                body: [
                    "Player registration: first name, last name, club, competition class, and optionally e-mail address. This data is collected to register players for competitions and compile start lists and results.",
                    "Club accounts: club name and a hashed password stored in Supabase. This data is used to let clubs log in and manage their own player registrations.",
                    "Competition results and scores: points and rankings entered during competitions. This data is published as competition results.",
                    "Language preference: stored only in your browser's local storage. We never transmit this to our servers.",
                ],
            },
            {
                heading: "3. Legal basis for processing",
                body: "We process personal data on the basis of legitimate interest (Article 6(1)(f) GDPR): organising and documenting competitive sporting events is a legitimate purpose of sports clubs and federations. Player registration data is also collected with the implicit consent of the registering club acting on behalf of its members.",
            },
            {
                heading: "4. How we store your data",
                body: "Personal data is stored in Supabase, a cloud database service with servers located within the European Union. Supabase acts as our data processor under a Data Processing Agreement (DPA) that meets GDPR requirements.",
            },
            {
                heading: "5. How long we keep your data",
                body: "Player and results data is retained for the duration of the active competition season and a reasonable period thereafter (typically one calendar year) to allow for results verification and federation reporting. Club account data is kept for as long as the club is active in the system. You may request deletion at any time.",
            },
            {
                heading: "6. Who we share your data with",
                body: "We do not sell or share personal data with third parties for marketing purposes. Competition results (names, clubs, rankings) may be published publicly on this site and shared with SvHKF as part of normal federation reporting.",
            },
            {
                heading: "7. Your rights",
                body: [
                    "Access: you have the right to request a copy of your personal data.",
                    "Rectification: you have the right to have inaccurate data corrected.",
                    "Erasure: you have the right to request deletion of your data.",
                    "Portability: you have the right to receive your data in a machine-readable format.",
                    "Objection: you have the right to object to the processing of your data.",
                    "To exercise these rights, contact us at the address below. We will respond within 30 days.",
                ],
            },
            {
                heading: "8. Cookies and local storage",
                body: "We do not use tracking cookies or analytics. The only browser storage we use is local storage to remember your language preference (Swedish, English, or Polish). This data never leaves your browser.",
            },
            {
                heading: "9. Contact",
                body: "For privacy-related questions or requests, contact the HSC administrator through the club login on this site, or reach out to your club's representative. You also have the right to lodge a complaint with the Swedish supervisory authority: Integritetsskyddsmyndigheten (IMY), imy.se.",
            },
        ],
    },
    sv: {
        title: "Integritetspolicy",
        updated: "Senast uppdaterad: september 2026",
        sections: [
            {
                heading: "1. Vem är vi",
                body: "HSC – Hästskokastarklubben (\"vi\") driver www.hscontest.se, ett tävlingssystem för hästskokastningsklubbar anslutna till Svenska Hästskokastarförbundet (SvHKF). Vi är personuppgiftsansvariga för de personuppgifter som behandlas via denna tjänst.",
            },
            {
                heading: "2. Vilka uppgifter vi samlar in och varför",
                body: [
                    "Spelarregistrering: förnamn, efternamn, klubb, tävlingsklass och valfritt e-postadress. Dessa uppgifter samlas in för att registrera spelare till tävlingar samt för att sammanställa startlistor och resultat.",
                    "Klubbkonton: klubbnamn och ett hashat lösenord lagrat i Supabase. Dessa uppgifter används för att ge klubbar möjlighet att logga in och hantera sina spelaranmälningar.",
                    "Tävlingsresultat och poäng: poäng och rankningar som registreras under tävlingar. Dessa uppgifter publiceras som tävlingsresultat.",
                    "Språkval: lagras endast i din webbläsares lokala lagring. Vi skickar aldrig denna information till våra servrar.",
                ],
            },
            {
                heading: "3. Rättslig grund för behandlingen",
                body: "Vi behandlar personuppgifter med stöd av berättigat intresse (artikel 6.1 f GDPR): att organisera och dokumentera tävlingsidrott är ett berättigat ändamål för idrottsklubbar och förbund. Spelarregistreringsdata samlas även in med den registrerande klubbens implicita samtycke i egenskap av ombud för sina medlemmar.",
            },
            {
                heading: "4. Hur vi lagrar dina uppgifter",
                body: "Personuppgifter lagras i Supabase, en molndatabastjänst med servrar belägna inom Europeiska unionen. Supabase agerar som vårt personuppgiftsbiträde under ett personuppgiftsbiträdesavtal (PBA) som uppfyller GDPR:s krav.",
            },
            {
                heading: "5. Hur länge vi sparar dina uppgifter",
                body: "Spelar- och resultatdata sparas under den aktiva tävlingssäsongen och en rimlig tid därefter (vanligtvis ett kalenderår) för att möjliggöra resultatverifiering och förbundsrapportering. Klubbkontodata sparas så länge klubben är aktiv i systemet. Du kan begära radering när som helst.",
            },
            {
                heading: "6. Vem vi delar dina uppgifter med",
                body: "Vi säljer eller delar inte personuppgifter med tredje part i marknadsföringssyfte. Tävlingsresultat (namn, klubbar, rankningar) kan publiceras offentligt på denna webbplats och delas med SvHKF som en del av normal förbundsrapportering.",
            },
            {
                heading: "7. Dina rättigheter",
                body: [
                    "Tillgång: du har rätt att begära en kopia av dina personuppgifter.",
                    "Rättelse: du har rätt att få felaktiga uppgifter korrigerade.",
                    "Radering: du har rätt att begära att dina uppgifter raderas.",
                    "Dataportabilitet: du har rätt att ta emot dina uppgifter i ett maskinläsbart format.",
                    "Invändning: du har rätt att invända mot behandlingen av dina uppgifter.",
                    "För att utöva dessa rättigheter, kontakta oss på adressen nedan. Vi svarar inom 30 dagar.",
                ],
            },
            {
                heading: "8. Cookies och lokal lagring",
                body: "Vi använder inga spårningscookies eller analys. Den enda webbläsarlagring vi använder är lokal lagring för att komma ihåg ditt språkval (svenska, engelska eller polska). Denna information lämnar aldrig din webbläsare.",
            },
            {
                heading: "9. Kontakt",
                body: "För integritetsfrågor eller begäranden, kontakta HSC-administratören via klubbinloggningen på denna webbplats, eller kontakta din klubbs representant. Du har också rätt att lämna in ett klagomål till den svenska tillsynsmyndigheten: Integritetsskyddsmyndigheten (IMY), imy.se.",
            },
        ],
    },
    pl: {
        title: "Polityka prywatności",
        updated: "Ostatnia aktualizacja: wrzesień 2026",
        sections: [
            {
                heading: "1. Kim jesteśmy",
                body: "HSC – Hästskokastarklubben (\"my\") prowadzi stronę www.hscontest.se, system zarządzania zawodami dla klubów rzutu podkową zrzeszonych w Svenska Hästskokastarförbundet (SvHKF). Jesteśmy administratorem danych osobowych przetwarzanych za pośrednictwem tej usługi.",
            },
            {
                heading: "2. Jakie dane zbieramy i dlaczego",
                body: [
                    "Rejestracja zawodników: imię, nazwisko, klub, klasa zawodów i opcjonalnie adres e-mail. Dane te są zbierane w celu rejestracji zawodników na zawody oraz tworzenia list startowych i wyników.",
                    "Konta klubów: nazwa klubu i zahaszowane hasło przechowywane w Supabase. Dane te umożliwiają klubom logowanie się i zarządzanie rejestracjami swoich zawodników.",
                    "Wyniki zawodów i punkty: punkty i rankingi wprowadzane podczas zawodów. Dane te są publikowane jako wyniki zawodów.",
                    "Preferencja językowa: przechowywana wyłącznie w lokalnym magazynie Twojej przeglądarki. Nigdy nie przesyłamy tych danych na nasze serwery.",
                ],
            },
            {
                heading: "3. Podstawa prawna przetwarzania",
                body: "Przetwarzamy dane osobowe na podstawie prawnie uzasadnionego interesu (art. 6 ust. 1 lit. f RODO): organizowanie i dokumentowanie sportowych zawodów wyczynowych jest uzasadnionym celem klubów sportowych i federacji. Dane rejestracyjne zawodników są również zbierane za dorozumianą zgodą rejestrującego klubu działającego w imieniu swoich członków.",
            },
            {
                heading: "4. Jak przechowujemy Twoje dane",
                body: "Dane osobowe są przechowywane w Supabase, usłudze baz danych w chmurze z serwerami znajdującymi się w Unii Europejskiej. Supabase działa jako nasz podmiot przetwarzający dane na podstawie umowy o przetwarzaniu danych (DPA) spełniającej wymogi RODO.",
            },
            {
                heading: "5. Jak długo przechowujemy Twoje dane",
                body: "Dane zawodników i wyniki są przechowywane przez czas trwania aktywnego sezonu zawodów i rozsądny okres po jego zakończeniu (zazwyczaj jeden rok kalendarzowy) w celu weryfikacji wyników i sprawozdawczości federacyjnej. Dane kont klubów są przechowywane przez cały czas aktywności klubu w systemie. Możesz zażądać usunięcia danych w dowolnym momencie.",
            },
            {
                heading: "6. Komu udostępniamy Twoje dane",
                body: "Nie sprzedajemy ani nie udostępniamy danych osobowych podmiotom trzecim w celach marketingowych. Wyniki zawodów (imiona, nazwiska, kluby, rankingi) mogą być publikowane publicznie na tej stronie i udostępniane SvHKF w ramach zwykłej sprawozdawczości federacyjnej.",
            },
            {
                heading: "7. Twoje prawa",
                body: [
                    "Dostęp: masz prawo zażądać kopii swoich danych osobowych.",
                    "Sprostowanie: masz prawo do poprawienia niedokładnych danych.",
                    "Usunięcie: masz prawo zażądać usunięcia swoich danych.",
                    "Przenoszenie danych: masz prawo do otrzymania swoich danych w formacie czytelnym maszynowo.",
                    "Sprzeciw: masz prawo wnieść sprzeciw wobec przetwarzania Twoich danych.",
                    "Aby skorzystać z tych praw, skontaktuj się z nami pod poniższym adresem. Odpowiemy w ciągu 30 dni.",
                ],
            },
            {
                heading: "8. Pliki cookie i lokalne przechowywanie",
                body: "Nie używamy plików cookie do śledzenia ani analityki. Jedyną pamięcią przeglądarki, której używamy, jest lokalny magazyn do zapamiętania Twojej preferencji językowej (szwedzki, angielski lub polski). Te dane nigdy nie opuszczają Twojej przeglądarki.",
            },
            {
                heading: "9. Kontakt",
                body: "W przypadku pytań lub żądań dotyczących prywatności skontaktuj się z administratorem HSC przez logowanie klubu na tej stronie lub skontaktuj się z przedstawicielem swojego klubu. Masz również prawo złożyć skargę do szwedzkiego organu nadzorczego: Integritetsskyddsmyndigheten (IMY), imy.se.",
            },
        ],
    },
};

export default function PrivacyPage() {
    const { lang, t } = useLanguage();
    const content = policy[lang];

    return (
        <main className="public-page">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="HSC home">
                    <span className="brand-mark">HSC</span>
                    <span>{t.brand_subtitle}</span>
                </Link>
            </header>

            <div className="privacy-wrap">
                <div className="privacy-inner">
                    <Link className="privacy-back" to="/">← {t.back_home}</Link>
                    <h1 className="privacy-title">{content.title}</h1>
                    <p className="privacy-updated">{content.updated}</p>

                    {content.sections.map((sec) => (
                        <section key={sec.heading} className="privacy-section">
                            <h2 className="privacy-section-heading">{sec.heading}</h2>
                            {Array.isArray(sec.body) ? (
                                <ul className="privacy-list">
                                    {sec.body.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="privacy-body">{sec.body}</p>
                            )}
                        </section>
                    ))}
                </div>
            </div>

            <footer className="site-footer">
                <div className="site-footer-inner">
                    <span className="site-footer-copy">
                        © {new Date().getFullYear()} HSC &mdash; Hästskokastarklubben
                    </span>
                    <span className="site-footer-divider" aria-hidden="true" />
                    <a
                        className="site-footer-link"
                        href="https://www.svhkf.se/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Svenska Hästskokastarförbundet
                    </a>
                </div>
            </footer>
        </main>
    );
}
