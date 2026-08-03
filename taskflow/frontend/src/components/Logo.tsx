export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="ChemLab">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9.5 2.5h5" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M10 2.5v6.2L4.9 18.6a2.1 2.1 0 0 0 1.9 2.9h10.4a2.1 2.1 0 0 0 1.9-2.9L14 8.7V2.5"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6.5 15.5c1.7-1 3.2 1 5 0s3.2 1 5 0" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" fill="var(--color-accent)" fillOpacity="0.25" />
      </svg>
      <span className="text-lg font-bold tracking-tight">
        Chem<span className="text-primary">Lab</span>
      </span>
    </span>
  );
}
