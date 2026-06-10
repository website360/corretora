import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WhatsAppIntegration } from "@/types/domain";

/** Normaliza o número para dígitos com DDI (assume Brasil 55 se faltar). */
function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (!d) return "";
  if (d.length <= 11 && !d.startsWith("55")) d = `55${d}`;
  return d;
}

async function getWhatsapp(companyId: string): Promise<WhatsAppIntegration | null> {
  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .maybeSingle();
    return (
      (data?.settings as { integrations?: { whatsapp?: WhatsAppIntegration } } | null)?.integrations
        ?.whatsapp ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Envia uma mensagem de texto por WhatsApp usando o provedor conectado da
 * empresa (Evolution Go ou Z-API). Best-effort — nunca lança. Meta (API Oficial)
 * exige template aprovado e não é suportado aqui ainda.
 */
export async function sendWhatsappText(
  companyId: string,
  toPhone: string,
  text: string,
): Promise<{ sent: boolean }> {
  const number = normalizePhone(toPhone);
  if (!number || !text) return { sent: false };
  const wa = await getWhatsapp(companyId);
  if (!wa?.provider) return { sent: false };

  try {
    if (wa.provider === "evolution" && wa.evolution?.baseUrl && wa.evolution.apiKey && wa.evolution.instance) {
      const base = wa.evolution.baseUrl.replace(/\/+$/, "");
      const res = await fetch(`${base}/message/sendText/${wa.evolution.instance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: wa.evolution.apiKey },
        body: JSON.stringify({ number, text }),
      });
      return { sent: res.ok };
    }

    if (wa.provider === "zapi" && wa.zapi?.instanceId && wa.zapi.token) {
      const url = `https://api.z-api.io/instances/${wa.zapi.instanceId}/token/${wa.zapi.token}/send-text`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(wa.zapi.clientToken ? { "Client-Token": wa.zapi.clientToken } : {}),
        },
        body: JSON.stringify({ phone: number, message: text }),
      });
      return { sent: res.ok };
    }
  } catch (e) {
    console.error("[whatsapp] envio falhou:", e);
  }
  return { sent: false };
}
