import { createClient } from "@/lib/supabase/server";
import { atualizarMembroEquipe } from "@/lib/actions";
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
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
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
