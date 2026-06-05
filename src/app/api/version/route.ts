import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

// O build id muda a cada deploy (arquivo .next/BUILD_ID). O cliente compara o
// valor inicial com o atual para detectar que há uma nova versão no ar.
let cached: string | null = null;
function buildId(): string {
  if (cached) return cached;
  try {
    cached = readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    cached = "dev";
  }
  return cached;
}

export async function GET() {
  return NextResponse.json(
    { version: buildId() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
