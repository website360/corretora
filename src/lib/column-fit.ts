/**
 * Auto-ajuste de largura de coluna (data-table).
 *
 * O ajuste automático só roda em colunas que o usuário ainda não dimensionou —
 * a largura escolhida à mão manda. O problema é que a medição do auto-ajuste
 * também era gravada no mesmo lugar da largura escolhida: bastava uma medição
 * para a coluna ficar congelada naquele valor para sempre, e o conteúdo virar
 * "Automó…" assim que uma etiqueta maior aparecesse.
 *
 * Agora quem manda é a marca de "o usuário arrastou esta coluna": sem ela, a
 * coluna volta a se medir a cada carregamento e acompanha o conteúdo.
 */

/** Menor largura que ainda mostra algo além de reticências. */
export const AUTO_FIT_MIN = 88;

/** Teto, para uma célula gigante não estourar o layout da tabela. */
export const AUTO_FIT_MAX = 640;

/**
 * A coluna deve se reajustar ao conteúdo?
 *
 * Sim sempre que o usuário não a arrastou. Mesmo arrastada, uma largura salva
 * abaixo do mínimo utilizável é tratada como resto de medição ruim, e não como
 * escolha — era o que antes congelava a coluna estreita a ponto de "A…".
 */
export function shouldAutoFit(manuallySized: boolean, persistedWidth?: number | null): boolean {
  if (!manuallySized) return true;
  return persistedWidth == null || persistedWidth < AUTO_FIT_MIN;
}

/**
 * Mantém a medida dentro dos limites. O piso é o mesmo AUTO_FIT_MIN de
 * shouldAutoFit de propósito: assim o resultado do ajuste nunca volta a pedir
 * ajuste no próximo carregamento.
 */
export function clampAutoFit(measured: number): number {
  return Math.min(Math.max(Math.ceil(measured), AUTO_FIT_MIN), AUTO_FIT_MAX);
}
