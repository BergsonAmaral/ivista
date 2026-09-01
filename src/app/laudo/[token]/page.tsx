import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";

// Página pública do laudo — acessada pelo cliente via link seguro (token).
export default async function LaudoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();

  const supabase = createAdminClient();
  const { data: entrega } = await supabase
    .from("entregas")
    .select("id, expira_em, visualizada_em, vistoria_id, clientes(nome)")
    .eq("token_acesso", token)
    .maybeSingle();
  if (!entrega) notFound();
  if (new Date(entrega.expira_em) < new Date()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-zinc-500">Este link de laudo expirou. Solicite um novo à vistoriadora.</p>
      </main>
    );
  }

  if (!entrega.visualizada_em) {
    await supabase
      .from("entregas")
      .update({ status: "visualizada", visualizada_em: new Date().toISOString() })
      .eq("id", entrega.id);
  }

  const { data: vistoria } = await supabase
    .from("vistorias")
    .select(
      "*, agendamentos(placa, marca, modelo, ano, endereco, cidade), profiles(nome)"
    )
    .eq("id", entrega.vistoria_id)
    .single();

  const [{ data: itens }, { data: registros }, { data: consulta }] = await Promise.all([
    supabase.from("checklist_itens").select("*").eq("ativo", true).order("ordem"),
    supabase.from("vistoria_itens").select("*").eq("vistoria_id", entrega.vistoria_id),
    supabase
      .from("consultas_veiculares")
      .select("resultado")
      .eq("vistoria_id", entrega.vistoria_id)
      .eq("status", "concluida")
      .maybeSingle(),
  ]);

  const ag = vistoria?.agendamentos as unknown as {
    placa: string; marca: string; modelo: string; ano: string; endereco: string; cidade: string;
  };
  const resultado = (consulta?.resultado ?? null) as {
    situacao?: string; restricoes?: string[]; chassi?: string;
  } | null;
  const registroPorItem = new Map((registros ?? []).map((r) => [r.checklist_item_id, r]));

  const paths = (registros ?? []).map((r) => r.foto_path).filter(Boolean) as string[];
  const fotoUrls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("vistoria-fotos")
      .createSignedUrls(paths, 3600);
    signed?.forEach((s, i) => {
      if (s.signedUrl) fotoUrls.set(paths[i], s.signedUrl);
    });
  }

  const CONDICAO: Record<string, string> = {
    bom: "Bom",
    regular: "Regular",
    danificado: "Danificado",
    ausente: "Ausente",
    nao_aplicavel: "N/A",
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <header className="mb-6 border-b border-zinc-200 pb-4">
        <div className="text-xs uppercase tracking-wide text-zinc-400">Laudo de vistoria veicular</div>
        <h1 className="text-2xl font-bold font-mono">{ag?.placa}</h1>
        <p className="text-zinc-600">
          {[ag?.marca, ag?.modelo, ag?.ano].filter(Boolean).join(" ")}
        </p>
        <p className="text-sm text-zinc-500">
          Local: {ag?.endereco}
          {ag?.cidade ? `, ${ag.cidade}` : ""} · Vistoriador:{" "}
          {(vistoria?.profiles as unknown as { nome: string })?.nome}
          {vistoria?.enviada_em
            ? ` · Realizada em ${new Date(vistoria.enviada_em).toLocaleDateString("pt-BR")}`
            : ""}
        </p>
      </header>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Identificação</h2>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
            <span className="text-zinc-500">Chassi físico:</span>{" "}
            <b className="font-mono">{vistoria?.chassi_fisico}</b>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
            <span className="text-zinc-500">Chassi documental:</span>{" "}
            <b className="font-mono">{vistoria?.chassi_documental}</b>
          </div>
          {resultado && (
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 sm:col-span-2">
              <span className="text-zinc-500">Consulta:</span> situação{" "}
              <b>{resultado.situacao}</b>
              {resultado.restricoes?.length
                ? ` · restrições: ${resultado.restricoes.join(", ")}`
                : " · sem restrições"}
            </div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Itens vistoriados</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(itens ?? []).map((it) => {
            const r = registroPorItem.get(it.id);
            const url = r?.foto_path ? fotoUrls.get(r.foto_path) : null;
            return (
              <div key={it.id} className="rounded-lg border border-zinc-200 overflow-hidden">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={it.nome} className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full bg-zinc-100" />
                )}
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{it.nome}</div>
                  <div className="text-[11px] text-zinc-500">
                    {CONDICAO[r?.condicao ?? ""] ?? "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {vistoria?.observacoes && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2">Observações</h2>
          <p className="text-sm text-zinc-600">{vistoria.observacoes}</p>
        </section>
      )}

      <footer className="text-xs text-zinc-400 border-t border-zinc-200 pt-4">
        Documento gerado eletronicamente pelo sistema AI Super Visão Fortaleza. Link de acesso
        pessoal e com validade limitada.
      </footer>
    </main>
  );
}
