"use client";

import { formatBytes, type MailAttachmentMeta } from "@/lib/mail-attachments";
import { fileExt, fileIconSrc } from "@/lib/file-icon";
import { cn } from "@/lib/utils";

function downloadAttachment(a: MailAttachmentMeta) {
  try {
    if (a.href.startsWith("data:")) {
      const el = document.createElement("a");
      el.href = a.href;
      el.download = a.name || "file";
      document.body.appendChild(el);
      el.click();
      el.remove();
      return;
    }
    const el = document.createElement("a");
    el.href = a.href;
    el.download = a.name || "file";
    el.rel = "noopener";
    el.target = "_blank";
    document.body.appendChild(el);
    el.click();
    el.remove();
  } catch {
    window.open(a.href, "_blank", "noopener,noreferrer");
  }
}

function typeBadge(name: string, mime?: string): string {
  const ext = fileExt(name);
  if (ext) return ext.toUpperCase().slice(0, 5);
  const t = (mime || "").toLowerCase();
  if (t.includes("pdf")) return "PDF";
  if (t.startsWith("image/")) return "IMG";
  if (t.startsWith("video/")) return "VIDEO";
  if (t.startsWith("audio/")) return "AUDIO";
  return "FILE";
}

export function MailAttachmentsList({
  items,
  className,
}: {
  items: MailAttachmentMeta[];
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div className={cn(className)}>
      <p className="mb-2.5 text-[13px] text-white/40 font-[family-name:var(--font-manrope)] font-semibold leading-none tracking-[-0.01em]">
        Вложения · {items.length}
      </p>
      <ul className="flex flex-wrap gap-2.5 m-0 p-0 list-none">
        {items.map((a) => {
          const badge = typeBadge(a.name, a.type);
          return (
            <li key={a.id} className="m-0 p-0">
              <button
                type="button"
                onClick={() => downloadAttachment(a)}
                title={`${a.name}${a.size > 0 ? ` · ${formatBytes(a.size)}` : ""}`}
                className="group w-[120px] sm:w-[128px] text-left cursor-pointer"
              >
                <span
                  className={cn(
                    "relative flex aspect-square w-full items-center justify-center overflow-hidden",
                    "rounded-[16px] border border-white/[0.08] bg-[var(--mail-attach,#242936)]",
                    "group-hover:border-white/16 group-hover:bg-[var(--mail-attach-hover,#2c3240)] transition-colors",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileIconSrc(a.name, a.type)}
                    alt=""
                    width={52}
                    height={52}
                    className="h-[52px] w-[52px] object-contain opacity-95 drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                  />
                  <span className="absolute left-2 bottom-2 rounded-[6px] bg-[#1a1e28]/92 border border-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white/75 font-[family-name:var(--font-manrope)]">
                    {badge}
                  </span>
                </span>
                <span className="mt-2 block truncate px-0.5 text-[13px] font-medium text-white/85 font-[family-name:var(--font-manrope)]">
                  {a.name}
                </span>
                {a.size > 0 && (
                  <span className="block truncate px-0.5 text-[11px] text-white/35 font-[family-name:var(--font-manrope)]">
                    {formatBytes(a.size)} ·{" "}
                    <span className="text-[#7eb6ff]/90 group-hover:text-[#9ec8ff]">
                      скачать
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
