/**
 * Regras de senha compartilhadas entre o schema de validação (Zod) e o
 * medidor visual de força. Manter a fonte única evita que o checklist
 * "ticando" na tela divirja do que o formulário realmente aceita.
 */

export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (v) => v.length >= 8 },
  { id: "upper", label: "Uma letra maiúscula", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "Uma letra minúscula", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "Um número", test: (v) => /\d/.test(v) },
];

/** True quando a senha satisfaz todas as regras obrigatórias. */
export function isPasswordValid(value: string): boolean {
  return passwordRules.every((rule) => rule.test(value));
}

export type PasswordStrength = {
  /** Quantas regras obrigatórias passaram. */
  passed: number;
  /** Total de regras. */
  total: number;
  /** 0–4: nível de força considerando regras + bônus por comprimento. */
  score: number;
  label: "Fraca" | "Média" | "Boa" | "Forte";
};

export function getPasswordStrength(value: string): PasswordStrength {
  const total = passwordRules.length;
  const passed = passwordRules.filter((rule) => rule.test(value)).length;

  // Pontuação: regras cumpridas + bônus por senhas longas / caractere especial.
  let score = passed;
  if (value.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  score = Math.min(score, 4);
  if (passed < total) score = Math.min(score, 2);

  const label =
    score >= 4 ? "Forte" : score === 3 ? "Boa" : score === 2 ? "Média" : "Fraca";

  return { passed, total, score, label };
}
