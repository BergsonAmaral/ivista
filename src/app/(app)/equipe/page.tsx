import { createClient } from "@/lib/supabase/server";
import { atualizarMembroEquipe, criarMembroEquipe } from "@/lib/actions";
import { Card, PageTitle, Alert, inputCls, btnPrimary } from "@/components/ui";

const ROLES = [
  { valor: "atendente", label: "Atendente" },
  { valor: "vistoriador", label: "Vistoriador" },
  { valor: "digitadora", label: "Digitadora" },
  { valor: "admin", label: "Administrador" },
];

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return (
      <div>
        <PageTitle title="Equipe" />
        <Alert tipo="info">
          Apenas administradores gerenciam a equipe. Peça a um admin para definir sua função.
        </Alert>
      </div>
    );
  }

  const { data: membros } = await supabase
    .from("profiles")
    .select("id, nome, role, ativo, created_at")
    .order("created_at");

  return (
    <div className="max-w-3xl">
      <PageTitle
        title="Equipe"
        subtitle="Novos cadastros entram como Atendente — defina aqui a função real de cada pessoa e ative/desative acessos"
      />
      {erro && <Alert tipo="erro">{erro}</Alert>}
      {ok && <Alert tipo="ok">{ok}</Alert>}

      <Card className="p-5 mb-6">
        <h2 className="font-semibold text-sm mb-1">Cadastrar novo membro</h2>
        <p className="text-xs text-slate-500 mb-3">
          Crie o acesso direto: a pessoa entra com o e-mail e a senha provisória que você definir
          (e pode trocar depois).
        </p>
        <form action={criarMembroEquipe} className="grid sm:grid-cols-2 gap-3">
          <input name="nome" required placeholder="Nome completo *" className={inputCls} />
          <input name="email" type="email" required placeholder="E-mail *" className={inputCls} />
          <input
            name="senha"
            required
            minLength={6}
            placeholder="Senha provisória * (mín. 6)"
            className={inputCls}
          />
          <select name="role" required defaultValue="vistoriador" className={inputCls}>
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.label}
              </option>
            ))}
          </select>
          <button className={`${btnPrimary} sm:col-span-2`}>Criar acesso</button>
        </form>
      </Card>

      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        Membros
      </h2>
      <div className="space-y-3">
        {(membros ?? []).map((m) => (
          <Card key={m.id} className="p-4">
            <form
              action={atualizarMembroEquipe}
              className="flex flex-wrap items-center gap-3"
            >
              <input type="hidden" name="profile_id" value={m.id} />
              <div className="min-w-[180px]">
                <div className="font-medium text-sm">
                  {m.nome}
                  {m.id === user!.id && (
                    <span className="text-xs text-zinc-400"> (você)</span>
                  )}
                </div>
                <div className="text-xs text-zinc-400">
                  desde {new Date(m.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <select
                name="role"
                defaultValue={m.role}
                className={`${inputCls} w-auto`}
              >
                {ROLES.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="ativo" defaultChecked={m.ativo} className="h-4 w-4" />
                Ativo
              </label>
              <button className={`${btnPrimary} ml-auto`}>Salvar</button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
