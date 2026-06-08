import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, text } from "./base";

export type BillingWelcomeEmailProps = {
  name?: string;
  planName: string;
  manageUrl: string;
};

export function BillingWelcomeEmail({ name, planName, manageUrl }: BillingWelcomeEmailProps) {
  const greeting = name ? `Olá, ${name.split(" ")[0]}!` : "Tudo certo!";

  return (
    <EmailLayout preview={`Plano ${planName} ativado`}>
      <Text style={text.heading}>{greeting}</Text>
      <Text style={text.paragraph}>
        O plano <strong>{planName}</strong> foi ativado para a sua corretora. Você já
        pode aproveitar todos os recursos incluídos.
      </Text>
      <Text style={text.paragraph}>
        A cobrança só acontece após o término do período de testes — você pode revisar
        ou alterar seu plano e forma de pagamento a qualquer momento.
      </Text>
      <Section style={{ margin: "8px 0 4px" }}>
        <Button href={manageUrl} style={text.button}>
          Gerenciar assinatura
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default BillingWelcomeEmail;
