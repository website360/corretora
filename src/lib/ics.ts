import "server-only";
import type { CalendarEvent } from "@/types/domain";

/** Escapa texto conforme RFC 5545 (vírgula, ponto-e-vírgula, barra, quebra). */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Dobra linhas longas em 75 octetos (RFC 5545), continuando com espaço. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    out.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
    i += 73;
  }
  return out.join("\r\n");
}

function utcStamp(iso: string | Date): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function dateStamp(iso: string | Date): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}

function eventLines(e: CalendarEvent): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${e.id}@corretora`, `DTSTAMP:${utcStamp(e.created_at)}`];

  if (e.all_day) {
    // Para evento de dia inteiro, DTEND é exclusivo (dia seguinte).
    const end = new Date(e.ends_at ?? e.starts_at);
    end.setUTCDate(end.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(e.starts_at)}`);
    lines.push(`DTEND;VALUE=DATE:${dateStamp(end.toISOString())}`);
  } else {
    lines.push(`DTSTART:${utcStamp(e.starts_at)}`);
    lines.push(`DTEND:${utcStamp(e.ends_at ?? e.starts_at)}`);
  }

  lines.push(`SUMMARY:${esc(e.title)}`);
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  lines.push("STATUS:CONFIRMED");
  lines.push("END:VEVENT");
  return lines;
}

/** Monta um documento iCalendar (VCALENDAR) assinável. */
export function buildCalendar(events: CalendarEvent[], calName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Corretora SaaS//Agenda//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`,
    `NAME:${esc(calName)}`,
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    ...events.flatMap(eventLines),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
