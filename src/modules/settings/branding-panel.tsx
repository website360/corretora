"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { companiesService } from "@/services/companies.service";
import { companySettingsService } from "@/services/company-settings.service";
import { uploadAvatar } from "@/services/storage.service";
import { applyBrandColor } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_COLOR = "#2563eb";
const PRESETS = ["#2563eb", "#0ea5e9", "#7c3aed", "#16a34a", "#dc2626", "#ea580c", "#0f172a"];

export function BrandingPanel() {
  const { user } = useSession();
  const router = useRouter();
  const companyId = user.company.id;

  // Logo
  const [logoUrl, setLogoUrl] = React.useState(user.company.logo_url);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Color
  const savedColor = user.company.settings?.branding?.primaryColor ?? DEFAULT_COLOR;
  const [color, setColor] = React.useState(savedColor);
  const [savingColor, setSavingColor] = React.useState(false);

  // Live preview while editing; restore to the saved value on unmount.
  React.useEffect(() => {
    applyBrandColor(color);
  }, [color]);
  React.useEffect(() => {
    return () => applyBrandColor(savedColor === DEFAULT_COLOR ? null : savedColor);
  }, [savedColor]);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadAvatar(file, `logos/${companyId}`);
      await companiesService.update(companyId, { logo_url: url });
      setLogoUrl(url);
      toast.success("Logotipo atualizado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    setUploadingLogo(true);
    try {
      await companiesService.update(companyId, { logo_url: null });
      setLogoUrl(null);
      toast.success("Logotipo removido");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveColor(next: string | null) {
    setSavingColor(true);
    try {
      await companySettingsService.update(companyId, {
        branding: { primaryColor: next },
      });
      toast.success("Cor da marca atualizada");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logotipo</CardTitle>
          <CardDescription>
            Sua marca aparece no topo do menu lateral. Use PNG com fundo transparente para melhor
            resultado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-5">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border bg-white">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logotipo" className="size-full object-contain" />
            ) : (
              <ImageIcon className="size-7 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogo}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                loading={uploadingLogo}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" /> Enviar logo
              </Button>
              {logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={removeLogo}
                  disabled={uploadingLogo}
                >
                  <Trash2 className="size-4" /> Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP ou SVG, até 2MB.</p>
          </div>
        </CardContent>
      </Card>

      {/* Color */}
      <Card>
        <CardHeader>
          <CardTitle>Cor da marca</CardTitle>
          <CardDescription>
            Define a cor principal de botões, links e destaques. O preview é aplicado na hora.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Cor principal</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-10 cursor-pointer rounded-md border bg-transparent p-1"
                  aria-label="Selecionar cor"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-32 font-mono"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setColor(p)}
                  style={{ backgroundColor: p }}
                  className={cn(
                    "size-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                    color.toLowerCase() === p.toLowerCase() && "ring-2 ring-foreground",
                  )}
                  aria-label={`Usar ${p}`}
                />
              ))}
            </div>
          </div>

          {/* Mini preview */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
            <Button size="sm">Botão primário</Button>
            <Button size="sm" variant="outline">
              Secundário
            </Button>
            <span className="text-sm font-medium text-primary">Link em destaque</span>
          </div>

          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setColor(DEFAULT_COLOR);
                saveColor(null);
              }}
              disabled={savingColor}
            >
              <RotateCcw className="size-4" /> Restaurar padrão
            </Button>
            <Button onClick={() => saveColor(color)} loading={savingColor}>
              Salvar cor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
