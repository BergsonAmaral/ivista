import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, Badge } from "@/components/ui";
import { MapPin, Clock, ChevronRight } from "lucide-react";
import { LocationTracker } from "@/components/LocationTracker";

// Tela do vistoriador: a rota DELE, dia a dia, com as paradas em ordem.
export default async function MinhaRotaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role, nome")
    .eq("id", user!.id)
    .maybeSingle();
  if (me?.role !== "vistoriador" && me?.role !== "admin") redirect("/");

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: rotas } = await supabase
    .from("rotas")
    .select(
      "id, data, rota_paradas(id, ordem, tempo_estimado_min, agendamentos(id, placa, marca, modelo, endereco, cidade, janela_inicio, contato_nome, contato_telefone))"
    )
    .eq("vistoriador_id", user!.id)
    .gte("data", hoje)
    .order("data")
    .limit(7);

  // vistorias vinculadas (para status e link do passo a passo)
  const agIds = (rotas ?? [])
    .flatMap((r) => r.rota_paradas ?? [])
    .map((p) => (p.agendamentos as unknown as { id: string })?.id)
    .filter(Boolean);
  const { data: vistorias } = agIds.length
    ? await supabase
        .from("vistorias")
        .select("id, agendamento_id, status")
        .in("agendamento_id", agIds)
    : { data: [] };
  const vistoriaPorAg = new Map((vistorias ?? []).map((v) => [v.agendamento_id, v]));

  return (
    <div className="max-w-2xl mx-auto">
      <PageTitle
        title="Minha rota"
        subtitle={`Olá, ${me?.nome?.split(" ")[0]} — suas vistorias em ordem de parada`}
      />
      <div className="mb-4">
        <LocationTracker />
      </div>

      {(rotas ?? []).map((r) => {
        const paradas = (r.rota_paradas ?? []).sort((a, b) => a.ordem - b.ordem);
        const total = paradas.reduce((s, p) => s + p.tempo_estimado_min, 0);
        const ehHoje = r.data === hoje;
        return (
          <div key={r.id} className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className={ehHoje ? "text-red-600" : "text-slate-400"}>
                {ehHoje
                  ? "Hoje"
                  : new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                    })}
              </span>
              <span className="text-slate-400 font-medium normal-case tracking-normal">
                · {paradas.length} parada(s) · ~{Math.floor(total / 60)}h
                {total % 60 ? `${total % 60}` : ""}
              </span>
            </h2>
            <div className="space-y-3">
              {paradas.map((p) => {
                const ag = p.agendamentos as unknown as {
                  id: string; placa: string; marca: string; modelo: string;
                  endereco: string; cidade: string; janela_inicio: string | null;
                  contato_nome: string | null; contato_telefone: string | null;
                };
                const vistoria = vistoriaPorAg.get(ag?.id);
                return (
                  <Link
                    key={p.id}
                    href={vistoria ? `/vistorias/${vistoria.id}` : "#"}
                    className="block"
                  >
                    <Card className="p-4 hover:-translate-y-0.5 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white text-sm font-black">
                          {p.ordem}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold">{ag?.placa}</span>
                            <span className="text-sm text-slate-500">
                              {[ag?.marca, ag?.modelo].filter(Boolean).join(" ")}
                            </span>
                            {vistoria && <Badge status={vistoria.status} />}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-slate-500 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {ag?.endereco}
                            {ag?.cidade ? `, ${ag.cidade}` : ""}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />~{p.tempo_estimado_min} min
                            </span>
                            {ag?.janela_inicio && (
                              <span>janela {String(ag.janela_inicio).slice(0, 5)}</span>
                            )}
                            {ag?.contato_nome && <span>contato: {ag.contato_nome}</span>}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {!rotas?.length && (
        <Card className="p-10 text-center text-sm text-slate-400">
          Nenhuma rota atribuída a você por enquanto. Quando a central atribuir, suas paradas
          aparecem aqui.
        </Card>
      )}
    </div>
  );
}
