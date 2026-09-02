"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { salvarFotoColeta } from "@/lib/actions";
import { Camera } from "lucide-react";

// Fase 3 — foto inicial obrigatória: a coleta só pode ser confirmada com ela no Storage.
export function ColetaFotoUpload({
  vistoriaId,
  fotoUrl,
}: {
  vistoriaId: string;
  fotoUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function upload(file: File) {
    setEnviando(true);
    setErro(null);
    try {
      const supabase = createClient();
      const path = `${vistoriaId}/coleta-inicial-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("vistoria-fotos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
      if (error) throw new Error(error.message);
      await salvarFotoColeta(vistoriaId, path);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg border ${
        fotoUrl ? "border-emerald-200 bg-emerald-50/40" : "border-zinc-200 bg-zinc-50"
      }`}
    >
      {fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fotoUrl}
          alt="Foto inicial do veículo"
          className="h-14 w-14 rounded-lg object-cover border border-zinc-200"
        />
      ) : (
        <div className="h-14 w-14 rounded-lg bg-zinc-100 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400">
          <Camera className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1">
        <div className="text-sm font-medium">
          Foto inicial do veículo no local {fotoUrl && <span className="text-emerald-600">✓</span>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <button
          type="button"
          disabled={enviando}
          onClick={() => fileRef.current?.click()}
          className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
        >
          {enviando ? "Enviando…" : fotoUrl ? "Trocar foto" : "Tirar foto"}
        </button>
        {!fotoUrl && (
          <div className="text-[11px] text-red-500 mt-1">
            obrigatória — a coleta só confirma com a foto enviada
          </div>
        )}
        {erro && <div className="text-[11px] text-red-600 mt-0.5">{erro}</div>}
      </div>
    </div>
  );
}
