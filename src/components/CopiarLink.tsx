"use client";

import { useState } from "react";

export function CopiarLink({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = `${window.location.origin}/laudo/${token}`;
        await navigator.clipboard.writeText(url);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
    >
      {copiado ? "✓ Copiado" : "Copiar link seguro"}
    </button>
  );
}
