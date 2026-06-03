"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { companySettingsService } from "@/services/company-settings.service";
import { kanbanService } from "@/services/kanban.service";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  ALL_SORT_KEYS,
  DEFAULT_DIR,
  DEFAULT_SORT_RULES,
  matchPreset,
  resolveSettings,
  SORT_LABELS,
  SORT_PRESETS,
} from "@/config/sort";
import type { SortKey, SortRule } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function dirLabel(rule: SortRule): string {
  if (rule.key === "priority") {
    return rule.dir === "desc" ? "Mais urgente primeiro" : "Menos urgente primeiro";
  }
  return rule.dir === "asc" ? "Mais cedo primeiro" : "Mais recente primeiro";
}

export function PreferencesPanel() {
  const { user, can } = useSession();
  const router = useRouter();
  const isAdmin = can(["admin", "super_admin"]);
  const initial = resolveSettings(user.company);

  const initialWildcard = user.company.settings?.wildcardColumnId ?? "";

  const [taskTimeEnabled, setTaskTimeEnabled] = React.useState(initial.taskTimeEnabled);
  const [sortRules, setSortRules] = React.useState<SortRule[]>(initial.sortRules);
  const [wildcardColumnId, setWildcardColumnId] = React.useState<string>(initialWildcard);
  const [wildcardBoardId, setWildcardBoardId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const { data: leadBoards } = useAsyncData(() => kanbanService.listBoards());
  const { data: leadColumns } = useAsyncData(() => kanbanService.listAllColumns());

  // Derive the board from the saved wildcard column once columns load.
  React.useEffect(() => {
    if (!wildcardColumnId || wildcardBoardId || !leadColumns) return;
    const col = leadColumns.find((c) => c.id === wildcardColumnId);
    if (col) setWildcardBoardId(col.board_id);
  }, [leadColumns, wildcardColumnId, wildcardBoardId]);

  const dirty =
    taskTimeEnabled !== initial.taskTimeEnabled ||
    JSON.stringify(sortRules) !== JSON.stringify(initial.sortRules) ||
    wildcardColumnId !== initialWildcard;

  const available = ALL_SORT_KEYS.filter((k) => !sortRules.some((r) => r.key === k));
  const activePreset = matchPreset(sortRules);

  function addRule(key: SortKey) {
    setSortRules((prev) =>
      prev.some((r) => r.key === key) ? prev : [...prev, { key, dir: DEFAULT_DIR[key] }],
    );
  }
  function removeRule(i: number) {
    setSortRules((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveRule(i: number, dir: -1 | 1) {
    setSortRules((prev) => {
      const next = [...prev];
      const to = i + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[i], next[to]] = [next[to]!, next[i]!];
      return next;
    });
  }
  function toggleDir(i: number) {
    setSortRules((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, dir: r.dir === "asc" ? "desc" : "asc" } : r)),
    );
  }

  async function save() {
    setSaving(true);
    try {
      await companySettingsService.update(user.company.id, {
        taskTimeEnabled,
        sortRules,
        wildcardColumnId: wildcardColumnId || null,
      });
      toast.success("Preferências salvas para toda a empresa");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar. Apenas administradores podem alterar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Apenas administradores podem alterar estas preferências. Você está vendo a configuração
          atual da empresa.
        </div>
      )}

      <fieldset disabled={!isAdmin} className="space-y-6 disabled:opacity-70">
        {/* Tarefas */}
        <Card>
          <CardHeader>
            <CardTitle>Tarefas</CardTitle>
            <CardDescription>Vale para toda a empresa e todos os usuários.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <div className="flex items-center gap-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">Habilitar horário nas tarefas</p>
                <p className="text-sm text-muted-foreground">
                  Quando ligado, é possível definir um horário além da data. Desligado, as tarefas
                  usam apenas a data.
                </p>
              </div>
              <Switch checked={taskTimeEnabled} onCheckedChange={setTaskTimeEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* Ordenação */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Ordenação de tarefas e eventos</CardTitle>
                <CardDescription>
                  Combine critérios em ordem. O primeiro decide; havendo empate, o próximo
                  desempata, e assim por diante.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortRules(DEFAULT_SORT_RULES)}
                className="shrink-0"
              >
                <RotateCcw className="size-3.5" /> Padrão
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Modelos prontos</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {SORT_PRESETS.map((preset) => {
                  const active = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSortRules(preset.rules)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors hover:border-primary/50",
                        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card",
                      )}
                    >
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Escolha um modelo ou ajuste os critérios manualmente abaixo.
              </p>
            </div>

            <div className="border-t pt-3" />

            {sortRules.length === 0 && (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                Nenhum critério. Adicione ao menos um abaixo.
              </p>
            )}

            <ul className="space-y-2">
              {sortRules.map((rule, i) => (
                <li
                  key={rule.key}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
                >
                  <Badge variant="secondary" className="size-6 justify-center p-0">
                    {i + 1}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{SORT_LABELS[rule.key]}</p>
                    <p className="text-xs text-muted-foreground">{dirLabel(rule)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleDir(i)}>
                    {rule.dir === "asc" ? (
                      <ArrowUp className="size-3.5" />
                    ) : (
                      <ArrowDown className="size-3.5" />
                    )}
                    Inverter
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === 0}
                    onClick={() => moveRule(i, -1)}
                    title="Subir"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === sortRules.length - 1}
                    onClick={() => moveRule(i, 1)}
                    title="Descer"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeRule(i)}
                    title="Remover"
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>

            {available.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="size-4" /> Adicionar critério
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {available.map((k) => (
                    <DropdownMenuItem key={k} onClick={() => addRule(k)}>
                      {SORT_LABELS[k]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <p className="pt-1 text-xs text-muted-foreground">
              Exemplo: <strong>Data e horário de vencimento</strong> → <strong>Prioridade</strong>{" "}
              ordena pelos prazos mais próximos e, em datas iguais, mostra os mais urgentes primeiro.
            </p>
          </CardContent>
        </Card>

        {/* Conversão de leads (etapa coringa) */}
        <Card>
          <CardHeader>
            <CardTitle>Conversão de leads</CardTitle>
            <CardDescription>
              Escolha a <strong>etapa coringa</strong> do kanban de Leads. Ao arrastar um lead para
              essa etapa, ele vira automaticamente um <strong>contato</strong> (cliente) e sai do
              funil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid max-w-lg gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kanban</Label>
                <Select
                  value={wildcardBoardId || "none"}
                  onValueChange={(v) => {
                    if (v === "none") {
                      setWildcardBoardId("");
                      setWildcardColumnId("");
                    } else {
                      setWildcardBoardId(v);
                      setWildcardColumnId(""); // reset etapa when board changes
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o kanban" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (desativado)</SelectItem>
                    {(leadBoards ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Etapa que converte em contato</Label>
                <Select
                  value={wildcardColumnId || "none"}
                  onValueChange={(v) => setWildcardColumnId(v === "none" ? "" : v)}
                  disabled={!wildcardBoardId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {(leadColumns ?? [])
                      .filter((c) => c.board_id === wildcardBoardId)
                      .sort((a, c) => a.position - c.position)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </fieldset>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Salvar para a empresa
          </Button>
        </div>
      )}
    </div>
  );
}
