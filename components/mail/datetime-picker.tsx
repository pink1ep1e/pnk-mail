"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Clock } from "@/lib/icons";
import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Format as ДД.ММ.ГГГГ ЧЧ:ММ */
export function formatRuDateTime(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Parse keyboard input: ДД.ММ.ГГГГ ЧЧ:ММ / ДД.ММ.ГГГГ / with - : etc.
 * Returns null if incomplete or invalid.
 */
export function parseRuDateTime(raw: string): Date | null {
  const s = raw.trim().replace(/\s+/g, " ");
  const m = s.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T]+(\d{1,2})[:.](\d{1,2}))?$/,
  );
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = m[4] != null ? Number(m[4]) : 9;
  const minute = m[5] != null ? Number(m[5]) : 0;
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

function buildMonthGrid(view: Date): Array<{ date: Date; inMonth: boolean }> {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  // Monday = 0
  let startPad = (first.getDay() + 6) % 7;
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  const start = new Date(year, month, 1 - startPad);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}

/** Mask helper: keep digits and auto-insert separators for typing. */
function maskDateTimeInput(prev: string, next: string): string {
  // Allow free edit / paste of partially valid strings
  const digits = next.replace(/\D/g, "").slice(0, 12);
  if (next.length < prev.length) {
    // Deleting — don't force mask rebuild aggressively
    return next.slice(0, 16);
  }
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += ".";
    if (i === 8) out += " ";
    if (i === 10) out += ":";
    out += digits[i];
  }
  return out;
}

type DateTimePickerProps = {
  value: Date | null;
  onChange: (d: Date | null) => void;
  onConfirm?: (d: Date) => void;
  confirmLabel?: string;
  className?: string;
};

export function DateTimePicker({
  value,
  onChange,
  onConfirm,
  confirmLabel = "Отложить",
  className,
}: DateTimePickerProps) {
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => value || now);
  const [selected, setSelected] = useState<Date>(() => {
    const base = value ? new Date(value) : new Date(now);
    if (!value) base.setMinutes(0, 0, 0);
    return base;
  });
  const [text, setText] = useState(() =>
    value ? formatRuDateTime(value) : "",
  );
  const [textError, setTextError] = useState(false);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) return;
    setSelected(new Date(value));
    setView(new Date(value));
    setText(formatRuDateTime(value));
  }, [value]);

  useEffect(() => {
    // Keep scroll lists near selected time
    const h = selected.getHours();
    const m = selected.getMinutes();
    hourRef.current?.querySelector(`[data-h="${h}"]`)?.scrollIntoView({
      block: "nearest",
    });
    minuteRef.current?.querySelector(`[data-m="${m}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [selected]);

  const grid = useMemo(() => buildMonthGrid(view), [view]);

  const applyDate = (d: Date) => {
    const next = new Date(selected);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setSelected(next);
    setText(formatRuDateTime(next));
    setTextError(false);
    onChange(next);
  };

  const applyHour = (h: number) => {
    const next = new Date(selected);
    next.setHours(h);
    setSelected(next);
    setText(formatRuDateTime(next));
    setTextError(false);
    onChange(next);
  };

  const applyMinute = (m: number) => {
    const next = new Date(selected);
    next.setMinutes(m);
    setSelected(next);
    setText(formatRuDateTime(next));
    setTextError(false);
    onChange(next);
  };

  const onTextChange = (raw: string) => {
    const masked = maskDateTimeInput(text, raw);
    setText(masked);
    const parsed = parseRuDateTime(masked);
    if (parsed) {
      setSelected(parsed);
      setView(parsed);
      setTextError(false);
      onChange(parsed);
    } else {
      setTextError(masked.length >= 10);
    }
  };

  const goToday = () => {
    const t = new Date();
    t.setSeconds(0, 0);
    setSelected(t);
    setView(t);
    setText(formatRuDateTime(t));
    setTextError(false);
    onChange(t);
  };

  const clear = () => {
    setText("");
    setTextError(false);
    onChange(null);
  };

  const canConfirm = !textError && Boolean(parseRuDateTime(text));

  return (
    <div className={cn("w-[min(100vw-24px,340px)] space-y-3", className)}>
      <div className="flex gap-2 rounded-[14px] border border-white/10 bg-[#14161c] p-2">
        {/* Calendar */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/90 font-[family-name:var(--font-manrope)]">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
              <ChevronDown size={14} className="opacity-50" />
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="h-7 w-7 rounded-[8px] inline-flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white"
                onClick={() => {
                  const n = new Date(view);
                  n.setMonth(n.getMonth() - 1);
                  setView(n);
                }}
                aria-label="Предыдущий месяц"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                className="h-7 w-7 rounded-[8px] inline-flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white"
                onClick={() => {
                  const n = new Date(view);
                  n.setMonth(n.getMonth() + 1);
                  setView(n);
                }}
                aria-label="Следующий месяц"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="h-7 text-center text-[11px] text-white/35 font-[family-name:var(--font-manrope)] leading-7"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map(({ date, inMonth }) => {
              const isSel = sameDay(date, selected);
              const isToday = sameDay(date, now);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => applyDate(date)}
                  className={cn(
                    "h-8 rounded-[8px] text-[12px] font-[family-name:var(--font-manrope)] tabular-nums",
                    !inMonth && "text-white/20",
                    inMonth && !isSel && "text-white/75 hover:bg-white/5",
                    isSel &&
                      "bg-transparent text-white ring-1 ring-inset ring-white/80",
                    isToday && !isSel && "text-[#4d9fff]",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={clear}
              className="text-[12px] text-[#4d9fff] font-[family-name:var(--font-manrope)] hover:text-[#7db8ff]"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={goToday}
              className="text-[12px] text-[#4d9fff] font-[family-name:var(--font-manrope)] hover:text-[#7db8ff]"
            >
              Сегодня
            </button>
          </div>
        </div>

        {/* Time */}
        <div className="w-[88px] shrink-0 border-l border-white/8 pl-2 flex flex-col">
          <div className="flex gap-1 mb-1.5">
            <div className="flex-1 h-8 rounded-[8px] border border-white/25 flex items-center justify-center text-[13px] font-semibold tabular-nums text-white">
              {pad2(selected.getHours())}
            </div>
            <div className="flex-1 h-8 rounded-[8px] border border-white/25 flex items-center justify-center text-[13px] font-semibold tabular-nums text-white">
              {pad2(selected.getMinutes())}
            </div>
          </div>
          <div className="flex gap-1 min-h-0 flex-1">
            <div
              ref={hourRef}
              className="flex-1 max-h-[168px] overflow-y-auto mail-scroll rounded-[8px] bg-[#0f1115]"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  data-h={h}
                  onClick={() => applyHour(h)}
                  className={cn(
                    "w-full h-7 text-[12px] tabular-nums font-[family-name:var(--font-manrope)]",
                    selected.getHours() === h
                      ? "bg-[#0066ff]/25 text-white"
                      : "text-white/45 hover:bg-white/5 hover:text-white/80",
                  )}
                >
                  {pad2(h)}
                </button>
              ))}
            </div>
            <div
              ref={minuteRef}
              className="flex-1 max-h-[168px] overflow-y-auto mail-scroll rounded-[8px] bg-[#0f1115]"
            >
              {Array.from({ length: 60 }, (_, m) => (
                <button
                  key={m}
                  type="button"
                  data-m={m}
                  onClick={() => applyMinute(m)}
                  className={cn(
                    "w-full h-7 text-[12px] tabular-nums font-[family-name:var(--font-manrope)]",
                    selected.getMinutes() === m
                      ? "bg-[#0066ff]/25 text-white"
                      : "text-white/45 hover:bg-white/5 hover:text-white/80",
                  )}
                >
                  {pad2(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="ДД.ММ.ГГГГ ЧЧ:ММ"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={() => {
            const parsed = parseRuDateTime(text);
            if (parsed) {
              setText(formatRuDateTime(parsed));
              setTextError(false);
            } else if (text.trim()) {
              setTextError(true);
            }
          }}
          className={cn(
            "w-full h-10 rounded-[12px] bg-[#0f1115] border px-3 pr-10 text-[13px] text-white/90 outline-none font-[family-name:var(--font-manrope)] tabular-nums",
            textError
              ? "border-[#e53935]/60 focus:border-[#e53935]"
              : "border-white/10 focus:border-white/25",
          )}
          aria-invalid={textError}
          aria-label="Дата и время"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35">
          <Clock size={15} />
        </span>
        {textError && (
          <p className="mt-1 text-[11px] text-[#e53935]/90 font-[family-name:var(--font-manrope)]">
            Формат: ДД.ММ.ГГГГ ЧЧ:ММ
          </p>
        )}
      </div>

      {onConfirm && (
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            const parsed = parseRuDateTime(text) || selected;
            if (!parsed || Number.isNaN(parsed.getTime())) return;
            if (parsed.getTime() < Date.now() - 60_000) {
              setTextError(true);
              return;
            }
            onConfirm(parsed);
          }}
          className="w-full h-10 rounded-[12px] bg-[#0066ff] text-white text-[14px] font-semibold font-[family-name:var(--font-manrope)] hover:bg-[#0052cc] disabled:opacity-40 disabled:cursor-default"
        >
          {confirmLabel}
        </button>
      )}
    </div>
  );
}

export function defaultScheduleDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export { startOfDay };
