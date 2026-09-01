"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Consulta = {
  id: string;
  status: string;
  tentativas: number;
  max_tentativas: number;
  erro: string | null;
  resultado: Record<string, unknown> | null;
};

// Fase 4 — painel da consulta veicular: processamento assíncrono com retry.
// O vistoriador NÃO precisa esperar: continua a vistoria e o painel atualiza sozinho.
export function ConsultaPanel({ consulta }: { consulta: Consulta | null }) {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);
  const ativo = consulta && (consulta.status === "pendente" || consulta.status === "processando");

  const processar = useCallback(async () => {
    setProcessando(true);
    try {
      await fetch("/api/consultas/process", { method: "POST" });
      router.refresh();
    } finally {
      setProcessando(false);
    }
  }, [router]);

  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => {
      processar();
    }, 8000);
    return () => clearInterval(t);
  }, [ativo, processar]);

  if (!consulta) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 p-3">
        Consulta veicular será disparada automaticamente ao confirmar a coleta.
      </div>
    );
  }

  if (consulta.status === "concluida" && consulta.resultado) {
    const r = consulta.resultado as {
      chassi?: string; marca?: string; modelo?: string; situacao?: string;
      restricoes?: string[]; cor?: string; ano_modelo?: string;
    };
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
        <div className="font-semibold text-emerald-800 mb-1">
          ✓ Consulta veicular concluída
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-emerald-900">
          <span>Chassi (doc.): <b className="font-mono">{r.chassi}</b></span>
          <span>Situação: <b>{r.situacao}</b></span>
          <span>{r.marca} {r.modelo}</span>
          <span>{r.cor} · {r.ano_modelo}</span>
        </div>
        {!!r.restricoes?.length && (
          <div className="mt-1 text-red-700">Restrições: {r.restricoes.join(", ")}</div>
        )}
      </div>
    );
  }

  if (consulta.status === "falha") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
        <div className="font-semibold text-red-800">
          Consulta falhou após {consulta.tentativas} tentativas
        </div>
        <div className="text-red-700">{consulta.erro}</div>
        <button
          onClick={processar}
          disabled={processando}
          className="mt-2 rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <div className="flex items-center gap-2 font-semibold text-amber-800">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        Consulta em processamento — tentativa {consulta.tentativas + 1} de {consulta.max_tentativas}
      </div>
      <p className="text-amber-700 mt-0.5">
        Você não precisa esperar: siga com as fotos. O resultado aparece aqui sozinho.
      </p>
      {consulta.erro && (
        <p className="text-xs text-amber-600 mt-1">Última falha: {consulta.erro}</p>
      )}
    </div>
  );
}
