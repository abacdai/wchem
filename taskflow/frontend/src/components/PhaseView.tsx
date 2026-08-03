import { compoundPhase, PHASE_LABEL, type Phase } from './LabGlassware';

interface PhaseViewProps {
  name: string;
  formula?: string;
  height?: number;
}

const ISO = {
  top: '0.866,0.5',
  bottom: '0.866,-0.5',
};

function SolidBlock({ phase }: { phase: Phase }) {
  void phase;
  return (
    <g>
      <polygon points={`0,0 ${ISO.top} 0,1 -${ISO.top}`} fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
      <polygon points={`0,0 ${ISO.top} 0,2 -${ISO.top}`} fill="#d1d5db" stroke="#6b7280" strokeWidth="1" />
      <polygon points={`0,0 -${ISO.top} 0,2 -${ISO.top}`} fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
      <polygon points={`0,0 ${ISO.top} 0,2 ${ISO.top}`} fill="#f3f4f6" stroke="#6b7280" strokeWidth="1" />
      <text x="0" y="1.35" textAnchor="middle" className="fill-zinc-600 dark:fill-zinc-300" fontSize="0.42" fontWeight="700">
        Fe
      </text>
    </g>
  );
}

function LiquidDrop({ phase }: { phase: Phase }) {
  void phase;
  return (
    <g>
      <path
        d="M0 -1.6 C0.7 -0.7 1.4 0 1.4 0.7 A1.4 1.4 0 0 1 -1.4 0.7 C-1.4 0 -0.7 -0.7 0 -1.6 Z"
        fill="rgba(56,189,248,0.5)"
        stroke="#38bdf8"
        strokeWidth="0.12"
      />
      <ellipse cx="0" cy="0.75" rx="1.25" ry="0.35" fill="rgba(14,165,233,0.35)" />
      <path d="M-0.55 -0.9 Q-0.3 -1.15 -0.05 -0.85 Q0.2 -0.55 -0.05 -0.3 Q-0.3 -0.6 -0.55 -0.9 Z" className="fill-white/70" />
      <text x="0" y="1.55" textAnchor="middle" className="fill-sky-700 dark:fill-sky-300" fontSize="0.42" fontWeight="700">
        H2O
      </text>
    </g>
  );
}

function GasCloud({ phase }: { phase: Phase }) {
  void phase;
  return (
    <g className="animate-pulse">
      <circle cx="-0.5" cy="-0.2" r="0.55" className="fill-sky-200/60 dark:fill-sky-500/30" />
      <circle cx="0.4" cy="-0.5" r="0.7" className="fill-sky-200/60 dark:fill-sky-500/30" />
      <circle cx="0.6" cy="0.2" r="0.45" className="fill-sky-200/60 dark:fill-sky-500/30" />
      <circle cx="-0.1" cy="0.35" r="0.4" className="fill-sky-200/60 dark:fill-sky-500/30" />
      <circle cx="0.1" cy="-0.05" r="0.35" className="fill-sky-300/70 dark:fill-sky-400/40" />
      <g className="animate-bounce">
        <circle cx="-1" cy="-0.9" r="0.14" className="fill-sky-400/80" />
        <circle cx="1.1" cy="-0.7" r="0.12" className="fill-sky-400/80" />
        <circle cx="0" cy="-1.1" r="0.1" className="fill-sky-400/80" />
      </g>
    </g>
  );
}

const VIEWS: Record<Phase, { label: string; Cmp: (p: { phase: Phase }) => JSX.Element }> = {
  solid: { label: 'Solid', Cmp: SolidBlock },
  liquid: { label: 'Liquid', Cmp: LiquidDrop },
  gas: { label: 'Gas', Cmp: GasCloud },
};

export function PhaseView({ name, formula, height = 220 }: PhaseViewProps) {
  const phase = compoundPhase(formula);
  const { Cmp } = VIEWS[phase];
  return (
    <div
      className="flex w-full flex-col items-center justify-center rounded-lg border border-border bg-gradient-to-b from-sky-50 to-slate-100 dark:border-border-dark dark:from-slate-800 dark:to-slate-900"
      style={{ height }}
      role="img"
      aria-label={`${name} shown as ${PHASE_LABEL[phase].toLowerCase()}`}
      data-testid="phase-view"
    >
      <svg viewBox="-1.8 -2 3.6 4.4" className="h-4/5 max-h-full w-auto">
        <Cmp phase={phase} />
      </svg>
      <div className="pb-1 text-center">
        <p className="text-xs font-semibold">{name}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark">{PHASE_LABEL[phase]}</p>
      </div>
    </div>
  );
}