"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

// Botão de envio com feedback: desabilita e mostra spinner enquanto a ação roda.
export function SubmitButton({
  children,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} name={name} value={value} className={className}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processando…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
