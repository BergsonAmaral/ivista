export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number; // índice da etapa atual (0-based); etapas anteriores = concluídas
}) {
  return (
    <ol className="flex items-center gap-0 overflow-x-auto py-3">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center shrink-0">
            {i > 0 && (
              <div
                className={`h-1 w-6 sm:w-10 rounded-full ${
                  done || active ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
            <div className="flex items-center gap-2 px-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                    : active
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/30 ring-4 ring-red-100"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-xs sm:text-sm whitespace-nowrap ${
                  active
                    ? "font-bold text-slate-900"
                    : done
                      ? "font-medium text-emerald-700"
                      : "text-slate-400"
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
