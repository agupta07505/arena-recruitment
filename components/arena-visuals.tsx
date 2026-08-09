export function SportMotionVisual() {
  return (
    <div className="division-visual sport-motion" aria-hidden="true">
      <div className="motion-code"><span>PACE</span><b>08.42</b><i>m/s</i></div>
      <svg viewBox="0 0 520 380" role="presentation">
        <defs>
          <linearGradient id="sportStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3c7" />
            <stop offset="0.5" stopColor="#ffb000" />
            <stop offset="1" stopColor="#6e4700" />
          </linearGradient>
          <filter id="sportGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="speed-lines">
          <path d="M20 285H190" /><path d="M70 315H238" /><path d="M5 344H145" />
        </g>
        <g className="runner" filter="url(#sportGlow)">
          <circle cx="332" cy="74" r="27" />
          <path d="M309 116 257 178l74 40 44-92" />
          <path d="m264 175-72 8-45 45" />
          <path d="m333 216-62 47-76 78" />
          <path d="m333 216 68 44 87 14" />
          <path d="m373 128 52 47 67-19" />
        </g>
        <path className="ground-scan" d="M20 350C170 327 357 327 510 350" />
      </svg>
      <div className="motion-readout"><i /><span>Motion tracked</span><b>LIVE</b></div>
    </div>
  );
}

export function EsportHudVisual() {
  return (
    <div className="division-visual esport-hud" aria-hidden="true">
      <div className="hud-status"><i /> SYSTEM READY <b>24 MS</b></div>
      <svg viewBox="0 0 520 380" role="presentation">
        <defs>
          <linearGradient id="esportStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#baf7ff" />
            <stop offset="0.55" stopColor="#54e8ff" />
            <stop offset="1" stopColor="#126574" />
          </linearGradient>
          <filter id="esportGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="hud-rings">
          <circle cx="260" cy="188" r="150" /><circle cx="260" cy="188" r="118" />
          <path d="M260 18v38M260 320v38M90 188h38M392 188h38" />
        </g>
        <g className="controller" filter="url(#esportGlow)">
          <path d="M183 145c-43 6-69 35-78 81l-8 42c-5 27 27 42 44 20l42-52h154l42 52c17 22 49 7 44-20l-8-42c-9-46-35-75-78-81-46-6-108-6-154 0Z" />
          <path d="M164 190h54M191 163v54" />
          <circle cx="345" cy="180" r="9" /><circle cx="371" cy="206" r="9" />
          <path d="M233 205h54" />
        </g>
      </svg>
      <div className="signal-bars"><span /><span /><span /><span /><span /></div>
    </div>
  );
}
