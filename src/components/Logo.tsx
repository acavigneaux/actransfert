export default function Logo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v10m0 0l-4-4m4 4l4-4" />
          <path d="M6 19h12" />
        </svg>
      </div>
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          AC<span className="text-accent">Transfert</span>
        </h1>
        <p className="text-[11px] text-muted tracking-widest uppercase">
          Drop &middot; Name &middot; Done
        </p>
      </div>
    </div>
  );
}
