import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, text } from "./base";

export type PaymentFailedEmailProps = {
  companyName?: string;
  manageUrl: string;
};

export function PaymentFailedEmail({ companyName, manageUrl }: PaymentFailedEmailProps) {
  return (
    <EmailLayout preview="Não conseguimos processar seu pagamento">
      <Text style={text.heading}>Houve um problema com seu pagamento</Text>
      <Text style={text.paragraph}>
        Não conseguimos processar a cobrança da assinatura
        {companyName ? ` da ${companyName}` : ""}. Para evitar a interrupção do acesso,
        atualize sua forma de pagamento.
      </Text>
      <Section style={{ margin: "8px 0 4px" }}>
        <Button href={manageUrl} style={text.button}>
          Atualizar pagamento
        </Button>
      </Section>
      <Text style={text.muted}>
        Se você já regularizou ou acredita que isto é um engano, ignore este e-mail.
      </Text>
    </EmailLayout>
  );
}

export default PaymentFailedEmail;
