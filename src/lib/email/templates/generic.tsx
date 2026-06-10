import { EmailLayout } from "./base";

/** Renderiza um corpo HTML (já com variáveis trocadas) dentro do layout. */
export function GenericEmail({ html, preview }: { html: string; preview?: string }) {
  return (
    <EmailLayout preview={preview ?? ""}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </EmailLayout>
  );
}
