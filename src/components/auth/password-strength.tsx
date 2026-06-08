"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordRules, getPasswordStrength } from "@/lib/password";

const BAR_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
] as const;

const LABEL_COLORS = {
  Fraca: "text-destructive",
  Média: "text-amber-600",
  Boa: "text-emerald-600",
  Forte: "text-emerald-600",
} as const;

/**
 * Medidor de força de senha com checklist que "tica" cada requisito conforme
 * o usuário digita. Não renderiza nada enquanto o campo estiver vazio.
 */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;

  const { score, label } = getPasswordStrength(value);

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-full flex-1 rounded-full transition-colors",
                i < score ? BAR_COLORS[score] : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-medium", LABEL_COLORS[label])}>{label}</span>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {passwordRules.map((rule) => {
          const ok = rule.test(value);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                ok ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {ok ? (
                <Check className="size-3.5 shrink-0" />
              ) : (
                <X className="size-3.5 shrink-0 text-muted-foreground/50" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
