"use client";

import * as React from "react";
import {
  Bookmark,
  ChevronDown,
  Lock,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { findUser } from "@/services/lookup";
import {
  filterPresetsService,
  type FilterPreset,
  type PresetFilters,
} from "@/services/filter-presets.service";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Barra reutilizável de filtros para qualquer lista: botão "Filtros"
 * (recolhível, com contador), "Filtros salvos" (presets pessoais e
 * compartilhados com a equipe, persistidos por usuário no banco) e "Limpar".
 *
 * O painel com os controles de filtro fica na própria view, exibido conforme
 * `filtersOpen`. Esta barra cuida apenas dos botões e dos presets.
 */
export function SavedFiltersBar({
  scope,
  filtersOpen,
  onToggleFilters,
  activeCount,
  onClear,
  getCurrent,
  onApply,
}: {
  /** Identifica a lista (ex.: "customers", "contracts"). */
  scope: string;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeCount: number;
  onClear: () => void;
  /** Snapshot dos filtros atuais (para salvar como preset). */
  getCurrent: () => PresetFilters;
  /** Aplica um conjunto de filtros salvos aos controles da view. */
  onApply: (filters: PresetFilters) => void;
}) {
  const { user } = useSession();
  const [presets, setPresets] = React.useState<FilterPreset[]>([]);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [shareNew, setShareNew] = React.useState(false);

  const refetch = React.useCallback(() => {
    filterPresetsService
      .list(scope)
      .then(setPresets)
      .catch(() => {});
  }, [scope]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleSave() {
    const n = name.trim();
    if (!n) return;
    try {
      await filterPresetsService.create({ scope, name: n, filters: getCurrent(), shared: shareNew });
    } catch {
      toast.error("Não foi possível salvar o filtro.");
      return;
    }
    refetch();
    setSaveOpen(false);
    setName("");
    setShareNew(false);
    toast.success(`Filtro "${n}" salvo.`);
  }

  async function handleRemove(p: FilterPreset) {
    try {
      await filterPresetsService.remove(p.id);
    } catch {
      toast.error("Não foi possível excluir o filtro.");
      return;
    }
    refetch();
    toast.success(`Filtro "${p.name}" excluído.`);
  }

  async function handleToggleShare(p: FilterPreset) {
    try {
      await filterPresetsService.update(p.id, { shared: !p.shared });
    } catch {
      toast.error("Não foi possível alterar o compartilhamento.");
      return;
    }
    refetch();
    toast.success(
      p.shared ? `"${p.name}" agora é só seu.` : `"${p.name}" compartilhado com a equipe.`,
    );
  }

  function handleApply(p: FilterPreset) {
    onApply(p.filters);
    toast.success(`Filtro "${p.name}" aplicado.`);
  }

  return (
    <>
      <Button
        variant={filtersOpen ? "default" : "outline"}
        size="sm"
        className="h-9"
        onClick={onToggleFilters}
      >
        <SlidersHorizontal /> Filtros
        {activeCount > 0 && (
          <Badge
            variant={filtersOpen ? "secondary" : "default"}
            className="ml-1 h-5 min-w-5 justify-center rounded-full px-1 text-[0.7rem]"
          >
            {activeCount}
          </Badge>
        )}
        <ChevronDown className={cn("transition-transform", filtersOpen && "rotate-180")} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Bookmark /> Filtros salvos
            {presets.length > 0 && (
              <span className="text-xs text-muted-foreground">({presets.length})</span>
            )}
            <ChevronDown className="opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Filtros salvos</DropdownMenuLabel>
          {presets.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Configure os filtros e salve para reutilizar com um clique.
            </p>
          ) : (
            presets.map((p) => {
              const mine = p.user_id === user.id;
              const owner = mine ? null : findUser(p.user_id)?.name;
              return (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() => handleApply(p)}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {p.shared ? (
                      <Users className="size-3.5 shrink-0 text-primary" />
                    ) : (
                      <Bookmark className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate">{p.name}</span>
                    {owner && (
                      <span className="shrink-0 text-xs text-muted-foreground">· {owner}</span>
                    )}
                  </span>
                  {mine && (
                    <span className="flex shrink-0 items-center">
                      <span
                        role="button"
                        tabIndex={0}
                        title={p.shared ? "Tornar só meu" : "Compartilhar com a equipe"}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleShare(p);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-primary"
                      >
                        {p.shared ? <Lock className="size-3.5" /> : <Users className="size-3.5" />}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        title="Excluir filtro"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(p);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setName("");
              setShareNew(false);
              setSaveOpen(true);
            }}
          >
            <Save /> Salvar filtro atual…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={onClear}
          title="Limpar a seleção de filtros"
        >
          <RotateCcw /> Limpar
        </Button>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar filtro</DialogTitle>
            <DialogDescription>
              Dê um nome para reaplicar esta combinação de filtros com um clique.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Ex.: Clientes VIP ativos"
            maxLength={40}
          />
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={shareNew}
              onChange={(e) => setShareNew(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="size-3.5" /> Compartilhar com a equipe
              </span>
              <span className="text-xs text-muted-foreground">
                Todos da empresa poderão aplicar este filtro. Só você pode editá-lo ou excluí-lo.
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              <Save /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
