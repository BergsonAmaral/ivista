export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm ${className}`}>
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
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Alert({ tipo, children }: { tipo: "erro" | "ok" | "info"; children: React.ReactNode }) {
  const styles = {
    erro: "bg-red-50 border-red-200 text-red-700",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  }[tipo];
  return <div className={`rounded-lg border text-sm p-3 mb-4 ${styles}`}>{children}</div>;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  solicitado: { label: "Solicitado", cls: "bg-zinc-100 text-zinc-700" },
  confirmado: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
  roteirizado: { label: "Roteirizado", cls: "bg-indigo-100 text-indigo-700" },
  em_andamento: { label: "Em andamento", cls: "bg-amber-100 text-amber-700" },
  concluido: { label: "Concluído", cls: "bg-emerald-100 text-emerald-700" },
  cancelado: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
  aguardando: { label: "Aguardando", cls: "bg-zinc-100 text-zinc-700" },
  coleta: { label: "Coleta", cls: "bg-blue-100 text-blue-700" },
  em_vistoria: { label: "Em vistoria", cls: "bg-amber-100 text-amber-700" },
  enviada: { label: "Enviada", cls: "bg-indigo-100 text-indigo-700" },
  em_conferencia: { label: "Em conferência", cls: "bg-purple-100 text-purple-700" },
  aprovada: { label: "Aprovada", cls: "bg-emerald-100 text-emerald-700" },
  entregue: { label: "Entregue", cls: "bg-emerald-100 text-emerald-700" },
  rejeitada: { label: "Rejeitada", cls: "bg-red-100 text-red-700" },
  pendente: { label: "Pendente", cls: "bg-zinc-100 text-zinc-700" },
  processando: { label: "Processando", cls: "bg-amber-100 text-amber-700" },
  concluida: { label: "Concluída", cls: "bg-emerald-100 text-emerald-700" },
  falha: { label: "Falha", cls: "bg-red-100 text-red-700" },
  visualizada: { label: "Visualizada", cls: "bg-emerald-100 text-emerald-700" },
};

export function Badge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-700" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400";
export const btnPrimary =
  "rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-40";
export const btnSecondary =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50";
