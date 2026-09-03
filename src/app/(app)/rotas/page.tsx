import { createClient } from "@/lib/supabase/server";
import { atribuirParada, desatribuirParada } from "@/lib/actions";
import { haversineKm } from "@/lib/geo";
import { Card, PageTitle, Alert, inputCls, btnPrimary } from "@/components/ui";
import { MapPin, Clock } from "lucide-react";
import { RouteMap, type MapPonto, type MapLinha } from "@/components/RouteMap";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SubmitButton } from "@/components/SubmitButton";

// Uma cor por vistoriador (marcadores do mapa e cabeçalho do cartão)
const CORES = ["#dc2626", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2"];

export default async function RotasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; data?: string }>;
}) {
  const { erro, data: dataParam } = await searchParams;
  const supabase = await createClient();
  const dataSel = dataParam ?? new Date().toISOString().slice(0, 10);

  const [{ data: pendentes }, { data: vistoriadores }, { data: rotas }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, placa, modelo, marca, endereco, cidade, complexidade, data_agendada, janela_inicio, latitude, longitude"
      )
      .in("status", ["solicitado", "confirmado"])
      .order("data_agendada", { ascending: true, nullsFirst: false }),
    supabase
      .from("profiles")
      .select("id, nome, base_lat, base_lng, ultima_lat, ultima_lng, localizacao_em")
      .eq("role", "vistoriador")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("rotas")
      .select(
        "id, data, vistoriador_id, rota_paradas(id, ordem, tempo_estimado_min, agendamento_id, agendamentos(placa, endereco, cidade, latitude, longitude, janela_inicio, status))"
      )
      .eq("data", dataSel),
  ]);

  const corDoVistoriador = new Map(
    (vistoriadores ?? []).map((v, i) => [v.id, CORES[i % CORES.length]])
  );

  // ===== sugestão por proximidade (última parada do dia ou base/casa) =====
  const datasPendentes = [
    ...new Set((pendentes ?? []).map((a) => a.data_agendada).filter(Boolean)),
  ] as string[];
  const { data: rotasGeo } = datasPendentes.length
    ? await supabase
        .from("rotas")
        .select("vistoriador_id, data, rota_paradas(ordem, agendamentos(latitude, longitude))")
        .in("data", datasPendentes)
    : { data: [] };

  function posicaoDoVistoriador(vId: string, data: string | null) {
    const rota = (rotasGeo ?? []).find((r) => r.vistoriador_id === vId && r.data === data);
    const paradas = ((rota?.rota_paradas ?? []) as unknown as {
      ordem: number;
      agendamentos: { latitude: number | null; longitude: number | null } | null;
    }[])
      .filter((p) => p.agendamentos?.latitude != null)
      .sort((a, b) => b.ordem - a.ordem);
    if (paradas.length) {
      return { lat: paradas[0].agendamentos!.latitude!, lng: paradas[0].agendamentos!.longitude! };
    }
    const v = (vistoriadores ?? []).find((x) => x.id === vId);
    if (v?.base_lat != null && v?.base_lng != null) return { lat: v.base_lat, lng: v.base_lng };
    return null;
  }

  function sugestaoPara(a: {
    latitude: number | null;
    longitude: number | null;
    data_agendada: string | null;
  }) {
    if (a.latitude == null || a.longitude == null) return null;
    const destino = { lat: a.latitude, lng: a.longitude };
    let melhor: { id: string; nome: string; km: number } | null = null;
    for (const v of vistoriadores ?? []) {
      const pos = posicaoDoVistoriador(v.id, a.data_agendada);
      if (!pos) continue;
      const km = haversineKm(pos, destino);
      if (!melhor || km < melhor.km) melhor = { id: v.id, nome: v.nome, km };
    }
    return melhor;
  }

  // ===== dados do mapa (dia selecionado + pendentes) =====
  type Parada = {
    id: string; ordem: number; tempo_estimado_min: number;
    agendamento_id?: string;
    agendamentos: {
      placa: string; endereco: string; cidade: string | null;
      latitude: number | null; longitude: number | null; janela_inicio: string | null;
      status?: string;
    } | null;
  };
  const pontos: MapPonto[] = [];
  const linhas: MapLinha[] = [];

  for (const r of rotas ?? []) {
    const cor = corDoVistoriador.get(r.vistoriador_id) ?? "#64748b";
    const paradas = ((r.rota_paradas ?? []) as unknown as Parada[]).sort(
      (a, b) => a.ordem - b.ordem
    );
    const coords: [number, number][] = [];
    // ponto de partida: casa/base do vistoriador
    const vist = (vistoriadores ?? []).find((x) => x.id === r.vistoriador_id);
    if (vist?.base_lat != null && vist?.base_lng != null) {
      pontos.push({
        lat: vist.base_lat,
        lng: vist.base_lng,
        cor,
        rotulo: "⌂",
        titulo: `Base de ${vist.nome}`,
      });
      coords.push([vist.base_lat, vist.base_lng]);
    }
    for (const p of paradas) {
      if (p.agendamentos?.latitude != null && p.agendamentos.longitude != null) {
        pontos.push({
          lat: p.agendamentos.latitude,
          lng: p.agendamentos.longitude,
          cor,
          rotulo: String(p.ordem),
          titulo: `${p.agendamentos.placa} — ${p.agendamentos.endereco}`,
        });
        coords.push([p.agendamentos.latitude, p.agendamentos.longitude]);
      }
    }
    if (coords.length > 1) linhas.push({ cor, coords });
  }
  // posição AO VIVO dos vistoriadores (últimos 15 minutos)
  const agora = Date.now();
  for (const v of vistoriadores ?? []) {
    if (
      v.ultima_lat != null &&
      v.ultima_lng != null &&
      v.localizacao_em &&
      agora - new Date(v.localizacao_em).getTime() < 15 * 60_000
    ) {
      const min = Math.max(0, Math.round((agora - new Date(v.localizacao_em).getTime()) / 60_000));
      pontos.push({
        lat: v.ultima_lat,
        lng: v.ultima_lng,
        cor: corDoVistoriador.get(v.id) ?? "#64748b",
        rotulo: "",
        titulo: `${v.nome} — ao vivo (há ${min} min)`,
        pulso: true,
      });
    }
  }

  for (const a of pendentes ?? []) {
    if (a.latitude != null && a.longitude != null && a.data_agendada === dataSel) {
      pontos.push({
        lat: a.latitude,
        lng: a.longitude,
        cor: "#64748b",
        rotulo: "?",
        titulo: `${a.placa} — sem vistoriador`,
      });
    }
  }

  const rotaPorVistoriador = new Map((rotas ?? []).map((r) => [r.vistoriador_id, r]));

  return (
    <div>
      <PageTitle
        title="Rotas do dia"
        subtitle="Cada vistoriador com suas paradas em ordem — o mapa mostra a distribuição na cidade"
      />
      {erro && <Alert tipo="erro">{erro}</Alert>}

      <form className="mb-4 flex items-center gap-2">
        <input type="date" name="data" defaultValue={dataSel} className={`${inputCls} w-auto`} />
        <button className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50">
          Ver dia
        </button>
      </form>

      <div className="mb-6">
        <AutoRefresh segundos={30} />
        <RouteMap pontos={pontos} linhas={linhas} />
        <p className="text-[11px] text-slate-400 mt-1.5">
          ⌂ base do vistoriador · números = ordem das paradas · ponto pulsante = posição ao
          vivo (atualiza a cada 30s) · cinza “?” = ainda sem vistoriador
        </p>
      </div>

      {/* ===== A distribuir ===== */}
      {(pendentes ?? []).length > 0 && (
        <>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            A distribuir ({pendentes!.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-3 mb-8">
            {pendentes!.map((a) => {
              const sugestao = sugestaoPara(a);
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold">{a.placa}</span>
                    <span className="text-sm text-slate-500">
                      {[a.marca, a.modelo].filter(Boolean).join(" ")}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">
                      {a.data_agendada
                        ? new Date(a.data_agendada + "T12:00:00").toLocaleDateString("pt-BR")
                        : "sem data"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {a.endereco}
                    {a.cidade ? `, ${a.cidade}` : ""}
                  </div>
                  {sugestao && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-2.5 py-1">
                      <MapPin className="h-3.5 w-3.5" /> Mais próximo:{" "}
                      <b>{sugestao.nome}</b> (~{sugestao.km.toFixed(1)} km)
                    </div>
                  )}
                  <form action={atribuirParada} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="agendamento_id" value={a.id} />
                    <select
                      name="vistoriador_id"
                      required
                      defaultValue={sugestao?.id ?? ""}
                      className={`${inputCls} w-auto flex-1 min-w-[150px]`}
                    >
                      <option value="">Vistoriador…</option>
                      {(vistoriadores ?? []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nome}
                          {sugestao?.id === v.id ? " (sugerido)" : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      name="data"
                      required
                      defaultValue={a.data_agendada ?? dataSel}
                      className={`${inputCls} w-auto`}
                    />
                    <SubmitButton className={btnPrimary}>Atribuir</SubmitButton>
                  </form>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ===== Rotas por vistoriador ===== */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        Vistoriadores — {new Date(dataSel + "T12:00:00").toLocaleDateString("pt-BR")}
      </h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(vistoriadores ?? []).map((v) => {
          const cor = corDoVistoriador.get(v.id)!;
          const rota = rotaPorVistoriador.get(v.id);
          const paradas = ((rota?.rota_paradas ?? []) as unknown as Parada[]).sort(
            (a, b) => a.ordem - b.ordem
          );
          const total = paradas.reduce((s, p) => s + p.tempo_estimado_min, 0);
          return (
            <Card key={v.id} className="overflow-hidden">
              <div
                className="px-4 py-3 flex items-center gap-2 text-white"
                style={{ backgroundColor: cor }}
              >
                <span className="font-bold text-sm">{v.nome}</span>
                <span className="ml-auto text-xs opacity-90 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {paradas.length} parada(s)
                  {total ? ` · ~${Math.floor(total / 60)}h${total % 60 || ""}` : ""}
                </span>
              </div>
              <div className="p-3">
                {paradas.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Sem rota neste dia.</p>
                )}
                <ol className="space-y-2">
                  {paradas.map((p) => (
                    <li key={p.id} className="flex items-start gap-2.5 text-sm">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-black mt-0.5"
                        style={{
                          backgroundColor:
                            p.agendamentos?.status === "concluido" ? "#059669" : cor,
                        }}
                      >
                        {p.agendamentos?.status === "concluido" ? "✓" : p.ordem}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-mono font-semibold">
                          {p.agendamentos?.placa}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {" "}· ~{p.tempo_estimado_min}min
                          {p.agendamentos?.janela_inicio
                            ? ` · ${String(p.agendamentos.janela_inicio).slice(0, 5)}`
                            : ""}
                        </span>
                        <div className="text-xs text-slate-500 truncate">
                          {p.agendamentos?.endereco}
                        </div>
                      </div>
                      {p.agendamentos?.status !== "concluido" && p.agendamento_id && (
                        <form action={desatribuirParada.bind(null, p.agendamento_id)}>
                          <button
                            title="Remover da rota (volta para A distribuir)"
                            className="text-slate-300 hover:text-red-500 text-sm font-bold px-1"
                          >
                            ×
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          );
        })}
        {!vistoriadores?.length && (
          <Card className="p-8 text-center text-slate-400 text-sm md:col-span-2 xl:col-span-3">
            Nenhum vistoriador ativo. Cadastre na tela Vistoriadores.
          </Card>
        )}
      </div>
    </div>
  );
}
