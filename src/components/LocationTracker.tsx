"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navigation, NavigationOff } from "lucide-react";

// Rastreador do vistoriador: envia a posição a cada ~30s enquanto a tela está aberta.
export function LocationTracker() {
  const [status, setStatus] = useState<"pedindo" | "ativo" | "negado" | "indisponivel">(
    "pedindo"
  );
  const ultimoEnvio = useRef(0);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("indisponivel");
      return;
    }
    const supabase = createClient();

    const enviar = async (pos: GeolocationPosition) => {
      const agora = Date.now();
      if (agora - ultimoEnvio.current < 30_000) return; // no máx. a cada 30s
      ultimoEnvio.current = agora;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({
          ultima_lat: pos.coords.latitude,
          ultima_lng: pos.coords.longitude,
          localizacao_em: new Date().toISOString(),
        })
        .eq("id", user.id);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("ativo");
        enviar(pos);
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "negado" : "indisponivel");
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  if (status === "ativo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-2.5 py-1">
        <Navigation className="h-3.5 w-3.5" />
        Localização ativa — a central acompanha sua posição
      </span>
    );
  }
  if (status === "negado") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-2.5 py-1">
        <NavigationOff className="h-3.5 w-3.5" />
        Localização desativada — permita no navegador para a central te acompanhar
      </span>
    );
  }
  return null;
}
