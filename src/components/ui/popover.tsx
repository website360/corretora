"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

/**
 * Sinaliza que o Popover está sendo renderizado dentro de um Dialog. Nesse
 * caso o conteúdo não é portalado (senão o react-remove-scroll do Radix
 * bloqueia a rolagem do dropdown). O Dialog provê `true`.
 */
const PopoverInDialogContext = React.createContext(false);

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    /**
     * Portala o conteúdo para o body. Se omitido, é automático: portala fora
     * de um Dialog e NÃO portala dentro (corrige a rolagem do dropdown).
     */
    portal?: boolean;
  }
>(({ className, align = "center", sideOffset = 8, portal, ...props }, ref) => {
  const inDialog = React.useContext(PopoverInDialogContext);
  const shouldPortal = portal ?? !inDialog;
  const content = (
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    />
  );
  return shouldPortal ? <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal> : content;
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverInDialogContext };
