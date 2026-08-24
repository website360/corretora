/**
 * Nome de etiqueta exibido na interface.
 *
 * O corte é por CONTAGEM DE CARACTERES, não pela largura disponível: o badge
 * já tem `truncate` no CSS, mas ali o ponto do corte muda conforme a coluna,
 * o zoom e a fonte. Um limite fixo deixa o resultado igual em toda tela.
 */
export const TAG_NAME_MAX = 40;

/** Até TAG_NAME_MAX caracteres; daí para frente, reticências. */
export function truncateTagName(name: string, max: number = TAG_NAME_MAX): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}
