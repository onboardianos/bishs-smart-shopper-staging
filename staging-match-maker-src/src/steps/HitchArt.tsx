// SWAP HITCH ART IN THIS FILE ONLY.
// Owner PNGs (512×512, white): src/steps/assets/hitch-bumper-pull.png and hitch-fifth-wheel.png.
// Set bumper/fifth to those imported URLs and the cards use <img class="ha-img"> (object-fit: contain).
// null keeps the built-in drawing until the files are dropped in.
export const HITCH_ART: { bumper: string | null; fifth: string | null } = {
  bumper: null,
  fifth: null,
};

export function BumperHitchArt({ id }: { id: string }) {
  if (HITCH_ART.bumper) {
    return <img id={id} className="ha ha-img" src={HITCH_ART.bumper} alt="Bumper hitch: trailer tongue, propane tank, and ball hitch with safety chains" draggable={false} />;
  }
  return (
    <svg id={id} className="ha" viewBox="0 0 320 132" role="img" aria-label="Bumper hitch: trailer tongue on the ball, with weight-distribution and sway bars">
      {/* ground */}
      <line className="ha-ground" x1="0" y1="112" x2="320" y2="112" />
      {/* truck rear (right) */}
      <path className="ha-body" d="M228 24 H320 V86 H240 Q228 86 228 74 Z" />
      <rect className="ha-dark" x="222" y="80" width="98" height="12" rx="3" />
      <circle className="ha-tire" cx="296" cy="96" r="16" /><circle className="ha-hub" cx="296" cy="96" r="6" />
      <rect className="ha-light" x="230" y="32" width="8" height="18" rx="2" />
      {/* receiver + shank + ball mount */}
      <rect className="ha-metal" x="196" y="82" width="30" height="9" rx="1.5" />
      <rect className="ha-metal" x="176" y="74" width="24" height="18" rx="2" />
      <circle className="ha-ball" cx="182" cy="70" r="7" />
      {/* trailer front wall (left edge) */}
      <path className="ha-trailer" d="M-4 8 H22 Q30 8 30 16 V84 H-4 Z" />
      <rect className="ha-glass" x="4" y="20" width="18" height="14" rx="2" />
      {/* trailer A-frame tongue + coupler */}
      <path className="ha-frame" d="M30 72 L150 66 L178 64" />
      <path className="ha-frame" d="M30 84 L150 70" />
      <path className="ha-coupler" d="M150 58 H186 Q192 58 192 64 V66 H168 L150 70 Z" />
      <rect className="ha-dark" x="160" y="46" width="8" height="14" rx="2" />
      <rect className="ha-metal" x="104" y="40" width="9" height="28" rx="2" />
      <circle className="ha-hub" cx="108.5" cy="38" r="5" />
      <rect className="ha-metal" x="100" y="96" width="17" height="5" rx="1" />
      <rect className="ha-metal" x="106" y="66" width="5" height="30" />
      {/* weight-distribution spring bars */}
      <path className="ha-wd" d="M178 86 Q120 92 60 80" />
      <rect className="ha-dark" x="54" y="74" width="10" height="14" rx="2" />
      <path className="ha-sway" d="M176 92 L128 80" />
      {/* safety chains */}
      <path className="ha-chain" d="M196 90 Q182 104 160 76" />
      {/* labels */}
      <text className="ha-label" x="182" y="22" textAnchor="middle">BALL HITCH</text>
      <line className="ha-lead" x1="182" y1="26" x2="182" y2="56" />
      <text className="ha-label" x="110" y="128" textAnchor="middle">WEIGHT + SWAY BARS</text>
      <line className="ha-lead" x1="110" y1="117" x2="110" y2="90" />
    </svg>
  );
}

export function FifthWheelHitchArt({ id }: { id: string }) {
  if (HITCH_ART.fifth) {
    return <img id={id} className="ha ha-img" src={HITCH_ART.fifth} alt="Fifth-wheel hitch: trailer nose over a pickup bed hitch" draggable={false} />;
  }
  return (
    <svg id={id} className="ha" viewBox="0 0 320 132" role="img" aria-label="Fifth-wheel hitch in the truck bed, with the trailer's front overhang and kingpin">
      <line className="ha-ground" x1="0" y1="112" x2="320" y2="112" />
      {/* truck: cab on the right, bed cut away */}
      <path className="ha-body" d="M248 30 H300 Q312 30 316 42 L320 56 V92 H248 Z" />
      <path className="ha-glass" d="M256 38 H296 Q304 38 307 46 L310 56 H256 Z" />
      <path className="ha-bed" d="M70 64 H246 V92 H70 Z" />
      <line className="ha-cut" x1="70" y1="64" x2="246" y2="64" />
      <rect className="ha-dark" x="64" y="88" width="256" height="8" rx="2" />
      <circle className="ha-tire" cx="112" cy="98" r="15" /><circle className="ha-hub" cx="112" cy="98" r="6" />
      <circle className="ha-tire" cx="282" cy="98" r="15" /><circle className="ha-hub" cx="282" cy="98" r="6" />
      {/* fifth-wheel hitch: rails, legs, saddle head */}
      <rect className="ha-metal" x="118" y="84" width="84" height="5" rx="1" />
      <path className="ha-metal" d="M138 84 L148 66 H172 L182 84 Z" />
      <path className="ha-saddle" d="M136 66 H184 Q186 58 178 56 H142 Q134 58 136 66 Z" />
      {/* trailer front overhang + kingpin box */}
      <path className="ha-trailer" d="M0 10 H210 Q228 10 230 26 V34 H0 Z" />
      <path className="ha-trailer" d="M0 34 H150 V50 H0 Z" />
      <rect className="ha-pinbox" x="150" y="34" width="30" height="16" rx="2" />
      <rect className="ha-ball" x="160" y="50" width="8" height="7" rx="1" />
      <text className="ha-label" x="40" y="26">FRONT OVERHANG + KINGPIN</text>
      <text className="ha-label" x="160" y="128" textAnchor="middle">5TH-WHEEL HITCH IN THE BED</text>
      <line className="ha-lead" x1="160" y1="117" x2="160" y2="90" />
    </svg>
  );
}
