type Action = "activate" | "deactivate" | "delete" | "remove_card";

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Falha na operação.");
  return json;
}

/** Super-admin (SaaS) management actions. */
export const adminService = {
  companyAction: (id: string, action: Action) => post("/api/admin/companies", { id, action }),
  userAction: (id: string, action: Action) => post("/api/admin/users", { id, action }),
};
