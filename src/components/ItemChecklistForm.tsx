"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { salvarItemVistoria } from "@/lib/actions";

type Props = {
  vistoriaId: string;
  item: { id: string; nome: string; categoria: string; foto_obrigatoria: boolean };
  registro: { condicao: string | null; foto_path: string | null } | null;
  fotoUrl: string | null;
  bloqueado: boolean;
};

const CONDICOES = [
  { valor: "bom", label: "Bom", cls: "peer-checked:bg-emerald-600 peer-checked:text-white" },
  { valor: "regular", label: "Regular", cls: "peer-checked:bg-amber-500 peer-checked:text-white" },
  { valor: "danificado", label: "Danificado", cls: "peer-checked:bg-red-600 peer-checked:text-white" },
  { valor: "ausente", label: "Ausente", cls: "peer-checked:bg-zinc-700 peer-checked:text-white" },
  { valor: "nao_aplicavel", label: "N/A", cls: "peer-checked:bg-zinc-500 peer-checked:text-white" },
];

export function ItemChecklistForm({ vistoriaId, item, registro, fotoUrl, bloqueado }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const completo = !!registro?.condicao && (!item.foto_obrigatoria || !!registro?.foto_path);

  async function uploadFoto(file: File) {
    setEnviandoFoto(true);
    setErro(null);
    try {
      const supabase = createClient();
      const path = `${vistoriaId}/${item.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("vistoria-fotos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
      if (error) throw new Error(error.message);
      const fd = new FormData();
      fd.set("vistoria_id", vistoriaId);
      fd.set("checklist_item_id", item.id);
      fd.set("condicao", registro?.condicao ?? "bom");
      fd.set("foto_path", path);
      startTransition(async () => {
        await salvarItemVistoria(fd);
        router.refresh();
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setEnviandoFoto(false);
    }
  }

  function marcarCondicao(condicao: string) {
    const fd = new FormData();
    fd.set("vistoria_id", vistoriaId);
    fd.set("checklist_item_id", item.id);
    fd.set("condicao", condicao);
    startTransition(async () => {
      await salvarItemVistoria(fd);
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        completo ? "border-emerald-200 bg-emerald-50/40" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-sm font-medium">
          {completo && <span className="text-emerald-600 mr-1">✓</span>}
          {item.nome}
        </div>
        <span className="text-[11px] text-zinc-400 uppercase">{item.categoria}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {CONDICOES.map((c) => (
          <label key={c.valor} className="cursor-pointer">
            <input
              type="radio"
              name={`condicao-${item.id}`}
              className="peer sr-only"
              checked={registro?.condicao === c.valor}
              disabled={bloqueado || pending}
              onChange={() => marcarCondicao(c.valor)}
            />
            <span
              className={`inline-block rounded-full border border-zinc-300 px-2.5 py-1 text-xs bg-white ${c.cls} peer-checked:border-transparent`}
            >
              {c.label}
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt={item.nome} className="h-14 w-14 rounded-lg object-cover border border-zinc-200" />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-zinc-100 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 text-xl">
            📷
          </div>
        )}
        <div className="flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFoto(f);
            }}
          />
          <button
            type="button"
            disabled={bloqueado || enviandoFoto}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
          >
            {enviandoFoto ? "Enviando…" : registro?.foto_path ? "Trocar foto" : "Tirar foto"}
          </button>
          <div className="text-[11px] mt-1">
            {item.foto_obrigatoria ? (
              registro?.foto_path ? (
                <span className="text-emerald-600">foto obrigatória ✓</span>
              ) : (
                <span className="text-red-500">foto obrigatória pendente</span>
              )
            ) : (
              <span className="text-zinc-400">foto opcional</span>
            )}
          </div>
          {erro && <div className="text-[11px] text-red-600 mt-0.5">{erro}</div>}
        </div>
      </div>
    </div>
  );
}
