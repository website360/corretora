import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Uploads an image to the public `avatars` bucket and returns its public URL.
 * In mock mode returns a local object URL (preview only).
 */
export async function uploadAvatar(file: File, prefix: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem (JPG, PNG...).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("A imagem deve ter no máximo 2MB.");
  }

  if (env.useMocks) {
    return URL.createObjectURL(file);
  }

  const sb = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${prefix}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("avatars").upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw error;

  const { data } = sb.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

/* ───────────────────────── Contract attachments ───────────────────────── */

const CONTRACT_BUCKET = "contract-files";
const CONTRACT_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const CONTRACT_ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export interface UploadedFile {
  path: string;
  name: string;
  size: number;
  mime_type: string;
}

/** Uploads an image/PDF to the private `contract-files` bucket. */
export async function uploadContractFile(
  file: File,
  contractId: string,
  companyId: string,
): Promise<UploadedFile> {
  const isImage = file.type.startsWith("image/");
  if (!CONTRACT_ALLOWED.includes(file.type) && !isImage) {
    throw new Error("Envie uma imagem (JPG, PNG, WEBP) ou um PDF.");
  }
  if (file.size > CONTRACT_MAX_BYTES) {
    throw new Error("O arquivo deve ter no máximo 10MB.");
  }

  if (env.useMocks) {
    return { path: URL.createObjectURL(file), name: file.name, size: file.size, mime_type: file.type };
  }

  const sb = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${companyId}/${contractId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from(CONTRACT_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, name: file.name, size: file.size, mime_type: file.type };
}

/** Returns a temporary signed URL to view/download a contract file. */
export async function getContractFileUrl(path: string): Promise<string> {
  // Mock paths are already object URLs.
  if (env.useMocks || path.startsWith("blob:") || path.startsWith("http")) return path;
  const sb = getSupabaseBrowserClient();
  const { data, error } = await sb.storage.from(CONTRACT_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Removes a contract file from storage (best-effort). */
export async function removeContractFile(path: string): Promise<void> {
  if (env.useMocks || path.startsWith("blob:") || path.startsWith("http")) return;
  const sb = getSupabaseBrowserClient();
  await sb.storage.from(CONTRACT_BUCKET).remove([path]);
}
