import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { env } from "@/config/env";

const styles = {
  body: {
    backgroundColor: "#f4f5f7",
    fontFamily:
      "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e6e8eb",
    borderRadius: "12px",
    maxWidth: "480px",
    margin: "0 auto",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#0b1220",
    padding: "20px 32px",
  },
  brand: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.01em",
  },
  content: { padding: "32px" },
  footer: { padding: "0 32px 28px" },
  footerText: { color: "#9aa1ab", fontSize: "12px", lineHeight: "18px", margin: 0 },
  hr: { borderColor: "#e6e8eb", margin: "0" },
} as const;

/** Moldura compartilhada por todos os e-mails transacionais. */
export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>{env.appName}</Text>
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Hr style={styles.hr} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              {env.appName} — a plataforma completa para a sua corretora de seguros.
            </Text>
            <Text style={styles.footerText}>
              Este é um e-mail automático. Em caso de dúvida, responda a esta mensagem.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Estilos reutilizáveis de texto/botão para os templates. */
export const text = {
  heading: {
    color: "#0b1220",
    fontSize: "20px",
    fontWeight: 600,
    lineHeight: "28px",
    margin: "0 0 16px",
  },
  paragraph: {
    color: "#3c4149",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 16px",
  },
  muted: {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "16px 0 0",
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600,
    padding: "12px 24px",
    textDecoration: "none",
  },
} as const;
