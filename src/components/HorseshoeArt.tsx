export default function HorseshoeArt() {
    return (
        <svg
            viewBox="0 0 560 380"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ width: "min(560px, 100%)", height: "auto", display: "block" }}
        >
            <defs>
                {/* Polished steel — cold blue-silver, lit from upper-left */}
                <linearGradient id="steel-a" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#dce8e8" />
                    <stop offset="18%"  stopColor="#9ab8b6" />
                    <stop offset="40%"  stopColor="#547070" />
                    <stop offset="70%"  stopColor="#243c3c" />
                    <stop offset="100%" stopColor="#0c1818" />
                </linearGradient>
                <radialGradient id="steel-a-hi" cx="30%" cy="30%" r="60%">
                    <stop offset="0%"   stopColor="#f0f8f8" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#9ab8b6" stopOpacity="0.00" />
                </radialGradient>

                {/* Slightly darker steel for the flying horseshoe */}
                <linearGradient id="steel-b" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#d2dcdc" />
                    <stop offset="20%"  stopColor="#8a9e9e" />
                    <stop offset="48%"  stopColor="#445858" />
                    <stop offset="76%"  stopColor="#1e2e2c" />
                    <stop offset="100%" stopColor="#0a1414" />
                </linearGradient>
                <radialGradient id="steel-b-hi" cx="28%" cy="28%" r="58%">
                    <stop offset="0%"   stopColor="#e8f0f0" stopOpacity="0.36" />
                    <stop offset="100%" stopColor="#8a9e9e" stopOpacity="0.00" />
                </radialGradient>

                {/* Brushed-metal stake */}
                <linearGradient id="stake-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#6a8a86" />
                    <stop offset="35%"  stopColor="#ccdcda" />
                    <stop offset="52%"  stopColor="#e8f2f0" />
                    <stop offset="70%"  stopColor="#b0c8c4" />
                    <stop offset="100%" stopColor="#6a8a86" />
                </linearGradient>

                {/* Sandy pit */}
                <radialGradient id="pit-grad" cx="50%" cy="40%" r="55%">
                    <stop offset="0%"   stopColor="#3a2e1c" />
                    <stop offset="60%"  stopColor="#281e10" />
                    <stop offset="100%" stopColor="#1a1208" />
                </radialGradient>

                {/*
                  Realistic metal filter:
                  1. Fractal-noise grain blended as overlay for metal texture
                  2. Specular lighting from a distant upper-left source using the
                     shape's blurred alpha as a height map — creates 3-D bevel look
                */}
                <filter id="metal" x="-20%" y="-20%" width="140%" height="140%"
                    colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.7 0.22"
                        numOctaves="4" seed="9" result="noise" />
                    <feColorMatrix type="matrix"
                        values="0 0 0 0 0.55  0 0 0 0 0.65  0 0 0 0 0.65  0 0 0 0.055 0"
                        in="noise" result="grain" />
                    <feBlend in="SourceGraphic" in2="grain" mode="overlay" result="with-grain" />

                    <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
                    <feSpecularLighting in="blur" surfaceScale="5"
                        specularConstant="0.9" specularExponent="28"
                        lightingColor="#c4d8d8" result="spec">
                        <feDistantLight azimuth="225" elevation="36" />
                    </feSpecularLighting>
                    <feComposite in="spec" in2="SourceAlpha" operator="in" result="spec-clip" />

                    <feBlend in="with-grain" in2="spec-clip" mode="screen" result="final" />
                    <feComposite in="final" in2="SourceAlpha" operator="in" />
                </filter>

                {/* Cast shadow */}
                <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="2" dy="8" stdDeviation="10"
                        floodColor="#000" floodOpacity="0.60" />
                </filter>

                {/* Soft atmospheric halo for flying horseshoe */}
                <filter id="glow" x="-35%" y="-35%" width="170%" height="170%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Faint background rings — depth, not decoration */}
            <circle cx="492" cy="36"  r="175" fill="rgba(255,255,255,0.025)" />
            <circle cx="492" cy="36"  r="112" fill="rgba(255,255,255,0.030)" />

            {/* Sandy pit around the stake */}
            <ellipse cx="390" cy="348" rx="148" ry="28"
                fill="url(#pit-grad)" opacity="0.85" />

            {/* Ground */}
            <line x1="0" y1="342" x2="560" y2="342"
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            {/* Scoring rings — very subtle */}
            <circle cx="390" cy="342" r="100" fill="none"
                stroke="rgba(255,255,255,0.07)" strokeWidth="1.2" strokeDasharray="5,7" />
            <circle cx="390" cy="342" r="62"  fill="none"
                stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" />

            {/* ── Stake ── */}
            <rect x="384" y="186" width="12" height="156" rx="6" fill="url(#stake-grad)" />
            <ellipse cx="390" cy="186" rx="8"  ry="5" fill="#b0c8c4" />
            <ellipse cx="390" cy="181" rx="15" ry="9" fill="url(#stake-grad)" />
            <ellipse cx="390" cy="178" rx="9"  ry="5" fill="#e8f2f0" opacity="0.7" />

            {/* Throw arc — thin, barely visible */}
            <path d="M 52,328 C 100,200 238,124 380,216"
                fill="none" stroke="rgba(255,255,255,0.11)"
                strokeWidth="1.2" strokeDasharray="10,8" strokeLinecap="round" />

            {/*
             ══ RINGER HORSESHOE (polished steel, around stake) ══
             Arc centre (390, 268) | OR=72 | IR=46 | leg L=70
             left-outer x=318  right-outer x=462
             left-inner x=344  right-inner x=436
             legs bottom y=338

             Nail holes at mid-radius r=59 around (390, 268):
               left side  — 110° → (370,213)  140° → (345,230)  163° → (333,249)
               right side —  70° → (410,213)   40° → (435,230)   17° → (447,249)
            */}

            {/* Cast shadow */}
            <path
                d="M 318,338 L 318,268 A 72,72 0 0 1 462,268 L 462,338 L 436,338 L 436,268 A 46,46 0 0 0 344,268 L 344,338 Z"
                fill="#060e0e" filter="url(#shadow)" opacity="0.60"
            />
            {/* Metal body with grain + specular filter */}
            <path
                d="M 318,338 L 318,268 A 72,72 0 0 1 462,268 L 462,338 L 436,338 L 436,268 A 46,46 0 0 0 344,268 L 344,338 Z"
                fill="url(#steel-a)" stroke="rgba(20,40,40,0.40)" strokeWidth="1"
                filter="url(#metal)"
            />
            {/* Radial highlight overlay */}
            <path
                d="M 318,338 L 318,268 A 72,72 0 0 1 462,268 L 462,338 L 436,338 L 436,268 A 46,46 0 0 0 344,268 L 344,338 Z"
                fill="url(#steel-a-hi)"
            />
            {/* Outer-arc gleam — light catching the rounded top edge */}
            <path d="M 318,268 A 72,72 0 0 1 462,268"
                fill="none" stroke="rgba(220,240,240,0.45)"
                strokeWidth="4" strokeLinecap="round" />
            {/* Leg shading */}
            <line x1="322" y1="276" x2="322" y2="332"
                stroke="rgba(200,230,230,0.22)" strokeWidth="3" strokeLinecap="round" />
            <line x1="458" y1="276" x2="458" y2="332"
                stroke="rgba(6,14,14,0.30)" strokeWidth="3" strokeLinecap="round" />

            {/* Nail holes */}
            <ellipse cx="370" cy="213" rx="5" ry="5" fill="rgba(4,10,10,0.90)" />
            <ellipse cx="345" cy="230" rx="5" ry="5" fill="rgba(4,10,10,0.90)" />
            <ellipse cx="333" cy="249" rx="5" ry="5" fill="rgba(4,10,10,0.90)" />
            <ellipse cx="410" cy="213" rx="5" ry="5" fill="rgba(4,10,10,0.90)" />
            <ellipse cx="435" cy="230" rx="5" ry="5" fill="rgba(4,10,10,0.90)" />
            <ellipse cx="447" cy="249" rx="5" ry="5" fill="rgba(4,10,10,0.90)" />
            {/* Hole rim highlights — light catching punched metal edge */}
            <ellipse cx="369" cy="211" rx="3" ry="2.2" fill="rgba(180,220,220,0.44)" />
            <ellipse cx="344" cy="228" rx="3" ry="2.2" fill="rgba(180,220,220,0.44)" />
            <ellipse cx="332" cy="247" rx="3" ry="2.2" fill="rgba(180,220,220,0.44)" />
            <ellipse cx="409" cy="211" rx="3" ry="2.2" fill="rgba(180,220,220,0.24)" />
            <ellipse cx="434" cy="228" rx="3" ry="2.2" fill="rgba(180,220,220,0.24)" />
            <ellipse cx="446" cy="247" rx="3" ry="2.2" fill="rgba(180,220,220,0.24)" />

            {/* Toe caulks */}
            <ellipse cx="316" cy="340" rx="13" ry="5.5"
                fill="url(#steel-a)" stroke="rgba(20,40,40,0.30)" strokeWidth="0.8" />
            <ellipse cx="464" cy="340" rx="13" ry="5.5"
                fill="url(#steel-a)" stroke="rgba(20,40,40,0.30)" strokeWidth="0.8" />
            <ellipse cx="312" cy="338" rx="7"  ry="2.5" fill="rgba(200,230,230,0.40)" />
            <ellipse cx="460" cy="338" rx="7"  ry="2.5" fill="rgba(200,230,230,0.18)" />

            {/*
             ══ FLYING HORSESHOE (darker steel, mid-flight) ══
             OR=54 | IR=34 | L=64 | local origin at arc centre
             Nail holes at mid-radius r=44 (local):
               left  → (-28,-34)  (-40,-19)
               right → ( 28,-34)  ( 40,-19)
            */}
            <g transform="translate(158, 178) rotate(-24, 0, 9)" filter="url(#glow)">

                {/* Cast shadow */}
                <path
                    d="M -54,64 L -54,0 A 54,54 0 0 1 54,0 L 54,64 L 34,64 L 34,0 A 34,34 0 0 0 -34,0 L -34,64 Z"
                    fill="#040c0c" filter="url(#shadow)" opacity="0.55"
                />
                {/* Metal body */}
                <path
                    d="M -54,64 L -54,0 A 54,54 0 0 1 54,0 L 54,64 L 34,64 L 34,0 A 34,34 0 0 0 -34,0 L -34,64 Z"
                    fill="url(#steel-b)" stroke="rgba(10,20,20,0.40)" strokeWidth="1"
                    filter="url(#metal)"
                />
                {/* Radial highlight */}
                <path
                    d="M -54,64 L -54,0 A 54,54 0 0 1 54,0 L 54,64 L 34,64 L 34,0 A 34,34 0 0 0 -34,0 L -34,64 Z"
                    fill="url(#steel-b-hi)"
                />
                {/* Outer-arc gleam */}
                <path d="M -54,0 A 54,54 0 0 1 54,0"
                    fill="none" stroke="rgba(210,235,235,0.42)"
                    strokeWidth="4" strokeLinecap="round" />
                {/* Leg shading */}
                <line x1="-50" y1="8"  x2="-50" y2="56"
                    stroke="rgba(190,220,220,0.20)" strokeWidth="3" strokeLinecap="round" />
                <line x1="50"  y1="8"  x2="50"  y2="56"
                    stroke="rgba(4,12,12,0.28)"  strokeWidth="3" strokeLinecap="round" />

                {/* Nail holes */}
                <ellipse cx="-28" cy="-34" rx="4.5" ry="4.5" fill="rgba(4,10,10,0.90)" />
                <ellipse cx="-40" cy="-19" rx="4.5" ry="4.5" fill="rgba(4,10,10,0.90)" />
                <ellipse cx="28"  cy="-34" rx="4.5" ry="4.5" fill="rgba(4,10,10,0.90)" />
                <ellipse cx="40"  cy="-19" rx="4.5" ry="4.5" fill="rgba(4,10,10,0.90)" />
                <ellipse cx="-29" cy="-36" rx="2.5" ry="2"   fill="rgba(180,220,220,0.38)" />
                <ellipse cx="-41" cy="-21" rx="2.5" ry="2"   fill="rgba(180,220,220,0.38)" />
                <ellipse cx="27"  cy="-36" rx="2.5" ry="2"   fill="rgba(180,220,220,0.22)" />
                <ellipse cx="39"  cy="-21" rx="2.5" ry="2"   fill="rgba(180,220,220,0.22)" />

                {/* Toe caulks */}
                <ellipse cx="-52" cy="66" rx="13" ry="5"
                    fill="url(#steel-b)" stroke="rgba(10,20,20,0.35)" strokeWidth="0.8" />
                <ellipse cx="52"  cy="66" rx="13" ry="5"
                    fill="url(#steel-b)" stroke="rgba(10,20,20,0.35)" strokeWidth="0.8" />
                <ellipse cx="-56" cy="64" rx="7"  ry="2.5" fill="rgba(190,220,220,0.36)" />
                <ellipse cx="48"  cy="64" rx="7"  ry="2.5" fill="rgba(190,220,220,0.18)" />
            </g>

            {/* Motion lines — very subtle, nearly white */}
            <line x1="76"  y1="157" x2="106" y2="170"
                stroke="rgba(200,230,230,0.42)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="70"  y1="181" x2="103" y2="187"
                stroke="rgba(200,230,230,0.28)" strokeWidth="2.0" strokeLinecap="round" />
            <line x1="73"  y1="203" x2="105" y2="201"
                stroke="rgba(200,230,230,0.16)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}
