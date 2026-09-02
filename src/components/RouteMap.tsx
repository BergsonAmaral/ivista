"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPonto = {
  lat: number;
  lng: number;
  cor: string; // cor do vistoriador (hex)
  rotulo: string; // texto do marcador (nº da parada ou "?")
  titulo: string; // tooltip
  pulso?: boolean; // posição ao vivo (ponto pulsante)
};

export type MapLinha = { cor: string; coords: [number, number][] };

export function RouteMap({
  pontos,
  linhas,
}: {
  pontos: MapPonto[];
  linhas: MapLinha[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !ref.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(ref.current, { scrollWheelZoom: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];
      for (const linha of linhas) {
        if (linha.coords.length > 1) {
          L.polyline(linha.coords, {
            color: linha.cor,
            weight: 3,
            opacity: 0.6,
            dashArray: "6 6",
          }).addTo(map);

          // setas de direção no meio de cada trecho
          for (let i = 0; i < linha.coords.length - 1; i++) {
            const [lat1, lng1] = linha.coords[i];
            const [lat2, lng2] = linha.coords[i + 1];
            const meio: [number, number] = [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
            const rumo =
              (Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI; // 0° = norte
            const seta = L.divIcon({
              className: "",
              html: `<div style="transform:rotate(${rumo}deg);color:${linha.cor};font-size:18px;line-height:18px;text-shadow:0 0 3px #fff,0 0 3px #fff;font-weight:900">▲</div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });
            L.marker(meio, { icon: seta, interactive: false }).addTo(map);
          }
        }
      }
      for (const p of pontos) {
        bounds.push([p.lat, p.lng]);
        const html = p.pulso
          ? `<div style="position:relative;width:22px;height:22px">
               <div style="position:absolute;inset:0;border-radius:9999px;background:${p.cor};opacity:.45;animation:vista-pulse 1.6s ease-out infinite"></div>
               <div style="position:absolute;inset:4px;border-radius:9999px;background:${p.cor};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>
             </div>`
          : `<div style="background:${p.cor};color:#fff;width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${p.rotulo}</div>`;
        const icon = L.divIcon({
          className: "",
          html,
          iconSize: p.pulso ? [22, 22] : [26, 26],
          iconAnchor: p.pulso ? [11, 11] : [13, 13],
        });
        L.marker([p.lat, p.lng], { icon }).addTo(map).bindTooltip(p.titulo);
      }
      if (bounds.length) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else {
        map.setView([-3.7327, -38.527], 12); // Fortaleza
      }
    })();
    return () => {
      cancelado = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [pontos, linhas]);

  return (
    <div
      ref={ref}
      className="h-72 lg:h-96 w-full rounded-2xl border border-zinc-200 overflow-hidden z-0"
    />
  );
}
