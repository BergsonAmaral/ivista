export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-7 gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Alert({
  tipo,
  children,
}: {
  tipo: "erro" | "ok" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    erro: "bg-red-50 border-red-200 text-red-700",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-700",
    info: "bg-indigo-50 border-indigo-200 text-indigo-700",
  }[tipo];
  return <div className={`rounded-xl border text-sm p-3.5 mb-4 ${styles}`}>{children}</div>;
}

const STATUS_LABEL: Record<string, { label: string; cls: string; dot: string }> = {
  solicitado: { label: "Solicitado", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  confirmado: { label: "Confirmado", cls: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  roteirizado: { label: "Roteirizado", cls: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  em_andamento: { label: "Em andamento", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  concluido: { label: "Concluído", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  cancelado: { label: "Cancelado", cls: "bg-red-50 text-red-600", dot: "bg-red-500" },
  aguardando: { label: "Aguardando", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  coleta: { label: "Coleta", cls: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  em_vistoria: { label: "Em vistoria", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  enviada: { label: "Enviada", cls: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  em_conferencia: { label: "Em conferência", cls: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  aprovada: { label: "Aprovada", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  entregue: { label: "Entregue", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  rejeitada: { label: "Rejeitada", cls: "bg-red-50 text-red-600", dot: "bg-red-500" },
  pendente: { label: "Pendente", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  processando: { label: "Processando", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  concluida: { label: "Concluída", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  falha: { label: "Falha", cls: "bg-red-50 text-red-600", dot: "bg-red-500" },
  visualizada: { label: "Visualizada", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

export function Badge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export const inputCls =
  "w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-shadow";
export const btnPrimary =
  "rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500 active:bg-indigo-700 shadow-sm shadow-indigo-600/20 disabled:opacity-40 disabled:shadow-none transition-colors";
export const btnSecondary =
  "rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-zinc-50 transition-colors";
