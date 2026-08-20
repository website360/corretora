/**
 * Auto-ajuste de largura de coluna (data-table).
 *
 * O ajuste automático só roda em colunas que o usuário ainda não dimensionou —
 * a largura escolhida à mão manda. Só que uma largura salva pequena demais não
 * é escolha: é resto de uma medição ruim, e antes ficava congelada para sempre,
 * deixando a coluna estreita a ponto de o conteúdo virar "A…".
 *
 * Daí o mínimo utilizável: abaixo dele a largura salva é tratada como lixo e a
 * coluna volta a se ajustar sozinha.
 */

/** Menor largura que ainda mostra algo além de reticências. */
export const AUTO_FIT_MIN = 88;

/** Teto, para uma célula gigante não estourar o layout da tabela. */
export const AUTO_FIT_MAX = 640;

/** A coluna deve se reajustar? Sim quando nunca foi dimensionada ou quando a largura salva é inutilizável. */
export function shouldAutoFit(persistedWidth?: number | null): boolean {
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
