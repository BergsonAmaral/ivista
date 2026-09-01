export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number; // índice da etapa atual (0-based); etapas anteriores = concluídas
}) {
  return (
    <ol className="flex items-center gap-0 overflow-x-auto py-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center shrink-0">
            {i > 0 && (
              <div
                className={`h-0.5 w-6 sm:w-10 ${done || active ? "bg-emerald-500" : "bg-zinc-200"}`}
              />
            )}
            <div className="flex items-center gap-2 px-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-xs sm:text-sm whitespace-nowrap ${
                  active ? "font-semibold" : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
