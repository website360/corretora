import { Text } from "@react-email/components";
import { EmailLayout, text } from "./base";

/** Renderiza um corpo de texto simples (com quebras de linha) num e-mail. */
export function GenericEmail({ bodyText }: { bodyText: string }) {
  const lines = bodyText.split("\n");
  return (
    <EmailLayout preview={lines.find((l) => l.trim()) ?? ""}>
      {lines.map((ln, i) =>
        ln.trim() === "" ? (
          <div key={i} style={{ height: 8 }} />
        ) : (
          <Text key={i} style={text.paragraph}>
            {ln}
          </Text>
        ),
      )}
    </EmailLayout>
  );
}
