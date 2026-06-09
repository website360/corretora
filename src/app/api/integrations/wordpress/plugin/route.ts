import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/services/session.server";
import { env } from "@/config/env";
import { buildWordPressPlugin, zipSingleFile, WP_PLUGIN_SLUG } from "@/lib/wordpress/plugin";

export const runtime = "nodejs";

/**
 * Baixa o plugin WordPress da empresa logada, já configurado com a URL da API
 * e a chave da empresa, empacotado num .zip instalável.
 */
export async function GET() {
  const user = await getServerSessionUser();
  const apiKey = user.company.settings?.integrations?.wordpress?.apiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gere a chave de API antes de baixar o plugin." },
      { status: 400 },
    );
  }

  const apiUrl = `${env.appUrl.replace(/\/+$/, "")}/api/leads`;
  const php = buildWordPressPlugin({ appName: env.appName, apiUrl, apiKey });
  const zip = zipSingleFile(`${WP_PLUGIN_SLUG}/${WP_PLUGIN_SLUG}.php`, php);

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${WP_PLUGIN_SLUG}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
