import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, text } from "./base";

export type PortalInviteEmailProps = {
  name: string;
  companyName?: string;
  setPasswordUrl: string;
  loginUrl: string;
};

export function PortalInviteEmail({
  name,
  companyName,
  setPasswordUrl,
  loginUrl,
}: PortalInviteEmailProps) {
  const firstName = name.split(" ")[0] || name;
  const where = companyName ? ` da ${companyName}` : "";

  return (
    <EmailLayout preview={`Seu acesso ao portal${where}`}>
      <Text style={text.heading}>Olá, {firstName}! 👋</Text>
      <Text style={text.paragraph}>
        A corretora{where} liberou seu acesso ao portal do cliente, onde você acompanha suas
        apólices e documentos. Defina sua senha para entrar:
      </Text>
      <Section style={{ margin: "8px 0 4px" }}>
        <Button href={setPasswordUrl} style={text.button}>
          Definir minha senha
        </Button>
      </Section>
      <Text style={text.muted}>
        Depois, acesse pelo endereço: {loginUrl}
        <br />
        Se você não esperava este e-mail, pode ignorá-lo.
      </Text>
    </EmailLayout>
  );
}

export default PortalInviteEmail;
