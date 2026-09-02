"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Recarrega os dados da página em intervalos (posições ao vivo no mapa).
export function AutoRefresh({ segundos = 30 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
