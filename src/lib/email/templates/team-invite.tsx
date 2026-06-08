import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, text } from "./base";

export type TeamInviteEmailProps = {
  name: string;
  inviterName?: string;
  companyName?: string;
  setPasswordUrl: string;
};

export function TeamInviteEmail({
  name,
  inviterName,
  companyName,
  setPasswordUrl,
}: TeamInviteEmailProps) {
  const firstName = name.split(" ")[0] || name;
  const who = inviterName ? `${inviterName} ` : "";
  const where = companyName ? ` na ${companyName}` : "";

  return (
    <EmailLayout preview={`Você foi convidado para a equipe${where}`}>
      <Text style={text.heading}>Olá, {firstName}! 👋</Text>
      <Text style={text.paragraph}>
        {who}convidou você para acessar a plataforma{where}. Sua conta já está criada —
        falta apenas definir uma senha para começar.
      </Text>
      <Section style={{ margin: "8px 0 4px" }}>
        <Button href={setPasswordUrl} style={text.button}>
          Definir minha senha
        </Button>
      </Section>
      <Text style={text.muted}>
        Se o botão não funcionar, copie e cole este endereço no navegador:
        <br />
        {setPasswordUrl}
      </Text>
    </EmailLayout>
  );
}

export default TeamInviteEmail;
