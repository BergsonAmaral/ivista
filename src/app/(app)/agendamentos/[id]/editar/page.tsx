import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { atualizarAgendamento } from "@/lib/actions";
import { Card, PageTitle, Alert, inputCls, btnPrimary } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EditarAgendamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: ag }, { data: clientes }] = await Promise.all([
    supabase.from("agendamentos").select("*").eq("id", id).maybeSingle(),
    supabase.from("clientes").select("id, nome").order("nome"),
  ]);
  if (!ag) notFound();

  return (
    <div className="max-w-2xl">
      <PageTitle
        title={`Editar agendamento — ${ag.placa ?? ""}`}
        subtitle="Corrija os dados e salve. Se o endereço mudar, o mapa é atualizado automaticamente."
      />
      {erro && <Alert tipo="erro">{erro}</Alert>}

      <form action={atualizarAgendamento}>
        <input type="hidden" name="agendamento_id" value={ag.id} />
        <Card className="p-5 space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold mb-1">Veículo</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Placa *</span>
                <input
                  name="placa"
                  required
                  maxLength={7}
                  defaultValue={ag.placa ?? ""}
                  className={`${inputCls} font-mono uppercase`}
                />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Marca</span>
                <input name="marca" defaultValue={ag.marca ?? ""} className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Modelo</span>
                <input name="modelo" defaultValue={ag.modelo ?? ""} className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Ano</span>
                <input name="ano" defaultValue={ag.ano ?? ""} className={inputCls} />
              </label>
            </div>
            <label className="text-sm block">
              <span className="block text-zinc-500 mb-1">Complexidade</span>
              <select name="complexidade" defaultValue={ag.complexidade} className={inputCls}>
                <option value="baixa">Baixa — ~40 min</option>
                <option value="media">Média — ~60 min</option>
                <option value="alta">Alta — ~100 min</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold mb-1">Local e data</legend>
            <label className="text-sm block">
              <span className="block text-zinc-500 mb-1">Endereço *</span>
              <input name="endereco" required defaultValue={ag.endereco} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Cidade</span>
                <input name="cidade" defaultValue={ag.cidade ?? ""} className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Data *</span>
                <input
                  name="data_agendada"
                  type="date"
                  required
                  defaultValue={ag.data_agendada ?? ""}
                  className={inputCls}
                />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Janela início</span>
                <input
                  name="janela_inicio"
                  type="time"
                  defaultValue={ag.janela_inicio ?? ""}
                  className={inputCls}
                />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Janela fim</span>
                <input
                  name="janela_fim"
                  type="time"
                  defaultValue={ag.janela_fim ?? ""}
                  className={inputCls}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold mb-1">Contato e cliente</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Contato no local</span>
                <input name="contato_nome" defaultValue={ag.contato_nome ?? ""} className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Telefone</span>
                <input
                  name="contato_telefone"
                  defaultValue={ag.contato_telefone ?? ""}
                  className={inputCls}
                />
              </label>
            </div>
            <label className="text-sm block">
              <span className="block text-zinc-500 mb-1">Empresa cliente</span>
              <select name="cliente_id" defaultValue={ag.cliente_id ?? ""} className={inputCls}>
                <option value="">— sem vínculo —</option>
                {(clientes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block">
              <span className="block text-zinc-500 mb-1">Observações</span>
              <textarea
                name="observacoes"
                rows={2}
                defaultValue={ag.observacoes ?? ""}
                className={inputCls}
              />
            </label>
          </fieldset>

          <SubmitButton className={`${btnPrimary} w-full`}>Salvar alterações</SubmitButton>
        </Card>
      </form>
    </div>
  );
}
