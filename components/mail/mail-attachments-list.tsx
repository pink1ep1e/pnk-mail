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
      <p className="mb-2.5 text-[13px] text-white/45 font-[family-name:var(--font-manrope)] font-semibold leading-none">
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
                    "rounded-[18px] border border-white/12 bg-[#12141a]",
                    "group-hover:border-[#0066ff]/45 group-hover:bg-[#161a24] transition-colors",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileIconSrc(a.name, a.type)}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
                  />
                  <span className="absolute left-2 bottom-2 rounded-[6px] bg-[#0066ff]/90 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white font-[family-name:var(--font-manrope)]">
                    {badge}
                  </span>
                </span>
                <span className="mt-2 block truncate px-0.5 text-[13px] font-semibold text-white/90 font-[family-name:var(--font-manrope)]">
                  {a.name}
                </span>
                {a.size > 0 && (
                  <span className="block truncate px-0.5 text-[11px] text-white/40 font-[family-name:var(--font-manrope)]">
                    {formatBytes(a.size)} · скачать
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
