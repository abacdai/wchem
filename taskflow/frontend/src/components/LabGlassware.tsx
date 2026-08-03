import { useState } from 'react';

export type Phase = 'gas' | 'liquid' | 'solid';

const KNOWN_PHASES: Record<string, Phase> = {
  H2O: 'liquid',
  H2O2: 'liquid',
  D2O: 'liquid',
  CO2: 'gas',
  O2: 'gas',
  N2: 'gas',
  H2: 'gas',
  CL2: 'gas',
  F2: 'gas',
  BR2: 'liquid',
  HG: 'liquid',
  C2H5OH: 'liquid',
  CH3OH: 'liquid',
  C6H6: 'liquid',
  H2SO4: 'liquid',
  HNO3: 'liquid',
  HCL: 'gas',
  NH3: 'gas',
  C6H12O6: 'solid',
  C12H22O11: 'solid',
  NACL: 'solid',
  KCL: 'solid',
  CACO3: 'solid',
  SIO2: 'solid',
  FE: 'solid',
  CU: 'solid',
  AU: 'solid',
  AG: 'solid',
  AL: 'solid',
  C: 'solid',
  S: 'solid',
  P: 'solid',
  NAOH: 'solid',
};

export function compoundPhase(formula?: string): Phase {
  if (!formula) return 'solid';
  return KNOWN_PHASES[formula.replace(/[^A-Za-z0-9]/g, '').toUpperCase()] ?? 'solid';
}

export const PHASE_LABEL: Record<Phase, string> = {
  gas: 'Gas',
  liquid: 'Liquid',
  solid: 'Solid',
};

const PHASE_TONE: Record<Phase, string> = {
  gas: 'text-sky-600 dark:text-sky-300',
  liquid: 'text-blue-600 dark:text-blue-300',
  solid: 'text-zinc-600 dark:text-zinc-300',
};

const LIQUID_FILL = 'rgba(56, 189, 248, 0.45)';
const SOLID_FILL = 'rgba(161, 161, 170, 0.65)';

function Fill({ phase }: { phase: Phase }) {
  if (phase === 'gas') {
    return (
      <g aria-hidden="true">
        <circle cx="42" cy="46" r="4" className="fill-sky-300/70 dark:fill-sky-500/60" />
        <circle cx="56" cy="38" r="3" className="fill-sky-300/70 dark:fill-sky-500/60" />
        <circle cx="50" cy="56" r="2.5" className="fill-sky-300/70 dark:fill-sky-500/60" />
      </g>
    );
  }
  if (phase === 'liquid') {
    return (
      <g aria-hidden="true">
        <rect x="25" y="66" width="52" height="48" rx="4" fill={LIQUID_FILL} />
        <line x1="25" y1="66" x2="77" y2="66" stroke={LIQUID_FILL} strokeWidth="2.5" />
        <ellipse cx="51" cy="68" rx="26" ry="3" fill="rgba(255,255,255,0.25)" />
      </g>
    );
  }
  return (
    <g aria-hidden="true">
      <rect x="25" y="84" width="52" height="30" rx="3" fill={SOLID_FILL} />
      <line x1="25" y1="84" x2="77" y2="84" stroke={SOLID_FILL} strokeWidth="2.5" />
      <circle cx="40" cy="94" r="1.6" className="fill-zinc-200 dark:fill-zinc-400" />
      <circle cx="58" cy="102" r="1.4" className="fill-zinc-200 dark:fill-zinc-400" />
      <circle cx="47" cy="108" r="1.3" className="fill-zinc-200 dark:fill-zinc-400" />
    </g>
  );
}

const GLASS = 'stroke-zinc-400 dark:stroke-zinc-500';

function Beaker({ phase }: { phase: Phase }) {
  return (
    <svg viewBox="0 0 100 140" className="h-28 w-20" role="img" aria-label="Beaker with compound">
      <path d="M22 24 H78 L73 118 H27 Z" fill="rgba(255,255,255,0.08)" className={GLASS} fillOpacity="0.06" strokeWidth="2" />
      <path d="M78 24 L90 32 H78 Z" className={GLASS} strokeWidth="1.5" />
      <path d="M27 118 L27 122 H73 L73 118" className={GLASS} strokeWidth="1.5" />
      <g clipPath="url(#beakerClip)">
        <Fill phase={phase} />
      </g>
      <defs>
        <clipPath id="beakerClip">
          <path d="M24 26 H76 L71 116 H29 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

function TestTube({ phase }: { phase: Phase }) {
  return (
    <svg viewBox="0 0 100 140" className="h-28 w-16" role="img" aria-label="Test tube with compound">
      <path d="M44 14 V104 A6 6 0 0 0 56 104 V14 Z" fill="rgba(255,255,255,0.08)" className={GLASS} fillOpacity="0.06" strokeWidth="2" />
      <path d="M41 14 H59" className={GLASS} strokeWidth="2" />
      <g clipPath="url(#tubeClip)">
        <Fill phase={phase} />
      </g>
      <defs>
        <clipPath id="tubeClip">
          <path d="M45 40 V103 A5 5 0 0 0 55 103 V40 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

function GraduatedCylinder({ phase }: { phase: Phase }) {
  const lines = [34, 52, 70, 88, 106];
  return (
    <svg viewBox="0 0 100 140" className="h-28 w-20" role="img" aria-label="Graduated cylinder with compound">
      <path d="M38 16 V116 L62 116 V16 Z" fill="rgba(255,255,255,0.08)" className={GLASS} fillOpacity="0.06" strokeWidth="2" />
      <path d="M62 16 L72 22 H62 Z" className={GLASS} strokeWidth="1.5" />
      <path d="M38 16 L28 22 H38 Z" className={GLASS} strokeWidth="1.5" />
      <g clipPath="url(#cylinderClip)">
        <Fill phase={phase} />
      </g>
      {lines.map((y) => (
        <line key={y} x1="38" y1={y} x2="46" y2={y} className={GLASS} strokeWidth="1.2" />
      ))}
      <defs>
        <clipPath id="cylinderClip">
          <path d="M40 18 V114 H60 V18 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

const GLASSWARE = [
  { key: 'beaker', label: 'Beaker', Cmp: Beaker },
  { key: 'tube', label: 'Test tube', Cmp: TestTube },
  { key: 'cylinder', label: 'Graduated cylinder', Cmp: GraduatedCylinder },
] as const;

interface LabGlasswareProps {
  name: string;
  formula?: string;
}

export function LabGlassware({ name, formula }: LabGlasswareProps) {
  const phase = compoundPhase(formula);
  const [active, setActive] = useState<(typeof GLASSWARE)[number]['key']>('beaker');

  return (
    <section className="rounded-lg border border-border bg-muted/40 p-3 dark:border-border-dark dark:bg-muted-dark/30" data-testid="lab-glassware">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Lab bench — {name}</h4>
        <span className={`rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium dark:bg-muted-dark ${PHASE_TONE[phase]}`}>
          {PHASE_LABEL[phase]} at room temperature
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-center gap-4">
        {GLASSWARE.map(({ key, label, Cmp }) => (
          <button
            key={key}
            type="button"
            aria-pressed={active === key}
            aria-label={`Show ${label} glassware`}
            title={label}
            onClick={() => setActive(key)}
            className={`rounded-lg p-1 transition-all ${active === key ? 'bg-primary/10 ring-2 ring-primary dark:bg-primary/20' : 'hover:bg-secondary/10'}`}
          >
            <Cmp phase={phase} />
            <span className="block text-center text-[10px] text-muted-foreground dark:text-muted-foreground-dark">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}