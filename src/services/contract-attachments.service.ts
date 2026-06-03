import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId, getCurrentUserId } from "@/services/lookup";
import {
  removeContractFile,
  uploadContractFile,
  type UploadedFile,
} from "@/services/storage.service";
import { sleep, uid } from "@/lib/utils";
import type { ContractAttachment } from "@/types/domain";

const mockAttachments: ContractAttachment[] = [];

export const contractAttachmentsService = {
  async list(contractId: string): Promise<ContractAttachment[]> {
    if (env.useMocks) {
      await sleep(120);
      return mockAttachments.filter((a) => a.contract_id === contractId);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("contract_attachments")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ContractAttachment[]) ?? [];
  },

  /** Uploads the file to storage and records its metadata. */
  async add(contractId: string, file: File): Promise<ContractAttachment> {
    const companyId = getCurrentCompanyId();
    const uploaded: UploadedFile = await uploadContractFile(file, contractId, companyId);
    if (env.useMocks) {
      await sleep(200);
      const record: ContractAttachment = {
        id: uid("att"),
        company_id: companyId,
        contract_id: contractId,
        name: uploaded.name,
        size: uploaded.size,
        mime_type: uploaded.mime_type,
        storage_path: uploaded.path,
        uploaded_by: getCurrentUserId() || null,
        created_at: new Date().toISOString(),
      };
      mockAttachments.unshift(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("contract_attachments")
      .insert({
        company_id: companyId,
        contract_id: contractId,
        name: uploaded.name,
        size: uploaded.size,
        mime_type: uploaded.mime_type,
        storage_path: uploaded.path,
        uploaded_by: getCurrentUserId() || null,
      })
      .select("*")
      .single();
    if (error) {
      // Roll back the orphaned upload if the metadata insert fails.
      await removeContractFile(uploaded.path).catch(() => {});
      throw error;
    }
    return data as ContractAttachment;
  },

  async remove(attachment: Pick<ContractAttachment, "id" | "storage_path">): Promise<void> {
    if (env.useMocks) {
      await sleep(150);
      const idx = mockAttachments.findIndex((a) => a.id === attachment.id);
      if (idx !== -1) mockAttachments.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("contract_attachments").delete().eq("id", attachment.id);
    if (error) throw error;
    await removeContractFile(attachment.storage_path).catch(() => {});
  },
};
