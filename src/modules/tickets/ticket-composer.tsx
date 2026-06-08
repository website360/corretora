"use client";

import * as React from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/common/mention-textarea";

const EMOJIS = ["👍", "🙏", "✅", "🎉", "🔥", "😊", "📎", "⚠️"];

interface TicketComposerProps {
  onSend: (body: string, kind: "message" | "internal_note") => Promise<void> | void;
}

/**
 * Internal team composer — every message is part of the task's internal
 * collaboration thread (there is no customer-facing channel).
 */
export function TicketComposer({ onSend }: TicketComposerProps) {
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [showEmoji, setShowEmoji] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const value = body.trim();
    if (!value) return;
    setSending(true);
    try {
      await onSend(value, "message");
      setBody("");
    } finally {
      setSending(false);
      ref.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="rounded-xl border bg-card transition-colors">
      <MentionTextarea
        ref={ref}
        value={body}
        onChange={setBody}
        onKeyDown={onKeyDown}
        placeholder="Escreva uma mensagem para a equipe (use @ para mencionar)..."
        className="min-h-[88px] resize-none border-0 shadow-none focus-visible:ring-0"
      />

      <div className="relative flex items-center gap-1 border-t px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowEmoji((s) => !s)}
          aria-label="Emojis"
        >
          <Smile />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Anexar arquivo">
          <Paperclip />
        </Button>
        {showEmoji && (
          <div className="absolute bottom-11 left-2 z-10 flex gap-1 rounded-lg border bg-popover p-1.5 shadow-md">
            {EMOJIS.map((e) => (
              <button
                key={e}
                className="rounded p-1 text-lg hover:bg-accent"
                onClick={() => {
                  setBody((b) => b + e);
                  setShowEmoji(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto mr-1 hidden text-[11px] text-muted-foreground sm:block">
          ⌘ + Enter para enviar
        </span>
        <Button size="sm" onClick={submit} loading={sending} disabled={!body.trim()}>
          <Send /> Enviar
        </Button>
      </div>
    </div>
  );
}
