"use client";

import { formatBytes, type MailAttachmentMeta } from "@/lib/mail-attachments";
import { fileIconSrc } from "@/lib/file-icon";
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

export function MailAttachmentsList({
  items,
  className,
}: {
  items: MailAttachmentMeta[];
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div className={cn("mt-4 space-y-2", className)}>
      <p className="text-[13px] text-white/45 font-[family-name:var(--font-manrope)] font-semibold">
        Вложения · {items.length}
      </p>
      <ul className="space-y-1.5">
        {items.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => downloadAttachment(a)}
              className="w-full flex items-center gap-3 rounded-[12px] border border-[#0066ff]/30 bg-[#0066ff]/12 px-3 py-2.5 text-left cursor-pointer hover:bg-[#0066ff]/18 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileIconSrc(a.name, a.type)}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 object-contain"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-white font-[family-name:var(--font-manrope)]">
                  {a.name}
                </span>
                <span className="block text-[12px] text-white/40 font-[family-name:var(--font-manrope)]">
                  {a.size > 0 ? `${formatBytes(a.size)} · ` : ""}
                  скачать
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
