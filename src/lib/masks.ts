import type { ChangeEvent } from "react";
import { formatCEP, formatCNPJ, formatCPF, formatDocument, formatPhone } from "@/utils/format";

/**
 * Builds an onChange handler that masks the input value in place. Designed to
 * plug straight into react-hook-form's `register("field", { onChange })` — it
 * rewrites `e.target.value` so both the DOM input and RHF receive the masked
 * value.
 */
function mask(fn: (v: string) => string) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    e.target.value = fn(e.target.value);
  };
}

export const maskPhone = mask(formatPhone);
export const maskCPF = mask(formatCPF);
export const maskCNPJ = mask(formatCNPJ);
export const maskDocument = mask(formatDocument);
export const maskCEP = mask(formatCEP);
