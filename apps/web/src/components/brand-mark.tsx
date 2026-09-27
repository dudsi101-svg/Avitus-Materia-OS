export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'amMark amMarkCompact' : 'amMark'} aria-hidden="true">
      <svg viewBox="0 0 120 92" role="img">
        <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 64c12 7 27 10 42 10 18 0 33-4 44-12-5 13-22 22-44 22-21 0-36-7-42-20Z" />
          <path d="M25 61h69" />
          <path d="M34 57c10-5 18-9 26-9 10 0 20 4 29 9" />
          <path d="M60 49V19" />
          <path d="M60 22c-11 2-20 9-24 18 11-1 19-5 24-12" />
          <path d="M60 22c11 2 20 9 24 18-11-1-19-5-24-12" />
          <path d="M60 21c-7-4-9-10-7-16 6 3 9 8 7 16Z" />
          <path d="M60 21c7-4 9-10 7-16-6 3-9 8-7 16Z" />
          <path d="M49 48c3-8 7-15 11-20 4 5 8 12 11 20" />
          <path d="M31 65c3 5 6 9 10 12M44 68c2 5 4 9 7 13M89 65c-3 5-6 9-10 12M76 68c-2 5-4 9-7 13" />
        </g>
      </svg>
    </span>
  );
}
