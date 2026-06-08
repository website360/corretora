"use client";

import * as React from "react";
import { useDirectory, useDirectoryStore } from "@/stores/directory-store";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/common/user-avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/types/domain";

type TextareaProps = React.ComponentPropsWithoutRef<typeof Textarea>;

interface MentionTextareaProps extends Omit<TextareaProps, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  /** Classe do wrapper posicional (ex.: "relative flex-1"). */
  wrapperClassName?: string;
}

/**
 * Textarea com autocomplete de menção: ao digitar "@", sugere os usuários do
 * sistema; selecionar insere "@Nome ". As menções são resolvidas depois com
 * `extractMentionIds` (src/lib/mentions).
 */
export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  className,
  wrapperClassName,
  ...rest
}: MentionTextareaProps) {
  useDirectory();
  const users = useDirectoryStore((s) => s.users);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [anchor, setAnchor] = React.useState(0); // índice do "@" ativo
  const [active, setActive] = React.useState(0);
  const [caretToSet, setCaretToSet] = React.useState<number | null>(null);

  const matches = React.useMemo(() => {
    if (!open) return [];
    const q = query.toLowerCase();
    return users.filter((u) => u.name?.toLowerCase().includes(q)).slice(0, 6);
  }, [open, query, users]);

  // Detecta o token "@..." imediatamente à esquerda do cursor.
  function syncMention(el: HTMLTextAreaElement) {
    const caret = el.selectionStart ?? 0;
    const upto = el.value.slice(0, caret);
    const at = upto.lastIndexOf("@");
    if (at === -1) {
      setOpen(false);
      return;
    }
    const before = at === 0 ? "" : upto[at - 1];
    const tokenStartsWord = at === 0 || /\s/.test(before ?? "");
    const token = upto.slice(at + 1);
    if (tokenStartsWord && !/\s/.test(token)) {
      setAnchor(at);
      setQuery(token);
      setActive(0);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    syncMention(e.target);
  }

  function choose(u: User) {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, anchor);
    const after = value.slice(caret);
    const insert = `@${u.name} `;
    onChange(before + insert + after);
    setOpen(false);
    setCaretToSet(before.length + insert.length);
  }

  // Reposiciona o cursor após inserir a menção.
  React.useEffect(() => {
    if (caretToSet != null && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(caretToSet, caretToSet);
      setCaretToSet(null);
    }
  }, [caretToSet, value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (open && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(matches[active]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => syncMention(e.currentTarget)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className={cn("w-full", className)}
        {...rest}
      />
      {open && matches.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-64 overflow-hidden rounded-lg border bg-popover p-1 shadow-md">
          {matches.map((u, i) => (
            <button
              type="button"
              key={u.id}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(u);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                i === active ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <UserAvatar name={u.name} src={u.avatar_url} className="size-6" />
              <span className="truncate">{u.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
