#!/usr/bin/env python3
"""Generate src/lib/generated/solid-icons.ts from Streamline Flex Solid SVGs.

Source: https://github.com/webalys-hq/streamline-vectors/tree/main/flex/solid
"""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib" / "generated" / "solid-icons.ts"
BASE = "https://raw.githubusercontent.com/webalys-hq/streamline-vectors/main/"

# App export name -> relative path under flex/solid/ (or None for hand-crafted fallback)
MAP: dict[str, str | None] = {
    "SearchIcon": "flex/solid/interface-essential/magnifying-glass.svg",
    "MenuIcon": None,  # hamburger fallback
    "ArrowRightIcon": None,  # chevron fallback
    "ArrowUpIcon": None,
    "ArrowDownIcon": None,  # chevron fallback (used by selects)
    "CheckIcon": None,  # bare check fallback
    "CheckCircleIcon": "flex/solid/interface-essential/check-square.svg",
    "XIcon": None,  # close fallback
    "PlusIcon": "flex/solid/programming/application-add.svg",
    "PencilIcon": "flex/solid/interface-essential/pen-1.svg",
    "EditIcon": "flex/solid/interface-essential/pencil-square.svg",
    "CameraIcon": "flex/solid/images-photography/camera-1.svg",
    "CrownIcon": "flex/solid/interface-essential/crown.svg",
    "HardDriveIcon": "flex/solid/computer-devices/hard-drive-1.svg",
    "IdCardIcon": "flex/solid/interface-essential/user-identifier-card.svg",
    "MailIcon": "flex/solid/mail/mail-send-envelope.svg",
    "MailOpenIcon": "flex/solid/mail/inbox-open.svg",
    "InboxIcon": "flex/solid/mail/inbox.svg",
    "SentIcon": "flex/solid/mail/mail-send-envelope.svg",
    "ForwardIcon": "flex/solid/phone/transfer-forwarding-call.svg",
    "ReplyIcon": "flex/solid/mail/mail-reply-all.svg",
    "SendIcon": "flex/solid/mail/mail-send-email-message-circle.svg",
    "Trash2Icon": "flex/solid/interface-essential/recycle-bin-3.svg",
    "ArchiveIcon": "flex/solid/interface-essential/archive-box.svg",
    "FolderInputIcon": "flex/solid/interface-essential/new-folder.svg",
    "FolderIcon": "flex/solid/interface-essential/new-folder.svg",
    "PaperclipIcon": "flex/solid/interface-essential/paperclip-1.svg",
    "PaperclipAltIcon": "flex/solid/interface-essential/paperclip-1.svg",
    "TagIcon": "flex/solid/interface-essential/tag.svg",
    "ClockIcon": "flex/solid/interface-essential/stopwatch.svg",
    "CloudIcon": "flex/solid/interface-essential/cloud.svg",
    "RefreshCwIcon": "flex/solid/interface-essential/rotate-right-circle.svg",
    "ReloadIcon": "flex/solid/interface-essential/rotate-left.svg",
    "SettingsIcon": "flex/solid/interface-essential/cog.svg",
    "ShieldAlertIcon": "flex/solid/interface-essential/shield-cross.svg",
    "ShieldIcon": "flex/solid/interface-essential/shield-1.svg",
    "SparklesIcon": "flex/solid/interface-essential/multiple-stars.svg",
    "UsersIcon": "flex/solid/interface-essential/user-collaborate-group.svg",
    "UserMultipleIcon": "flex/solid/interface-essential/user-collaborate-group.svg",
    "LayoutGridIcon": "flex/solid/interface-essential/dashboard-3.svg",
    "GridIcon": "flex/solid/interface-essential/dashboard-3.svg",
    "LogOutIcon": "flex/solid/interface-essential/logout-1.svg",
    "MoreHorizontalIcon": None,
    "MoreHorizontalCircleIcon": None,
    "QrCodeIcon": "flex/solid/money-shopping/qr-code.svg",
    "Loader2Icon": "flex/solid/interface-essential/hourglass.svg",
    "GlobeIcon": "flex/solid/map-travel/earth-1.svg",
    "InfoIcon": "flex/solid/interface-essential/information-circle.svg",
    "SaveIcon": "flex/solid/computer-devices/floppy-disk.svg",
    "LoginIcon": "flex/solid/interface-essential/login-1.svg",
    "CopyIcon": "flex/solid/interface-essential/copy-2.svg",
    "ShareIcon": "flex/solid/interface-essential/share-link.svg",
    "MessageIcon": "flex/solid/mail/chat-bubble-text-square.svg",
    "BellIcon": "flex/solid/interface-essential/bell-notification.svg",
    "FileTextIcon": "flex/solid/interface-essential/text-file.svg",
    "ImageIconIcon": "flex/solid/images-photography/landscape-2.svg",
    "Link2Icon": "flex/solid/interface-essential/link-chain.svg",
    "UnlinkIcon": "flex/solid/interface-essential/broken-link-1.svg",
    "BoldIcon": None,
    "ItalicIcon": None,
    "UnderlineIcon": None,
    "StrikethroughIcon": None,
    "AlignLeftIcon": "flex/solid/interface-essential/insert-center-left-1.svg",
    "AlignCenterIcon": "flex/solid/interface-essential/align-text-top.svg",
    "AlignRightIcon": "flex/solid/interface-essential/align-top-1.svg",
    "ListIcon": "flex/solid/entertainment/play-list-4.svg",
    "ListOrderedIcon": "flex/solid/interface-essential/number-sign.svg",
    "QuoteIcon": "flex/solid/mail/chat-bubble-text-square.svg",
    "SmileIcon": "flex/solid/mail/happy-face.svg",
    "EraserIcon": "flex/solid/interface-essential/clean-broom-wipe.svg",
    "HighlighterIcon": "flex/solid/interface-essential/color-picker.svg",
    "BrushIcon": "flex/solid/interface-essential/paintbrush-2.svg",
    "Undo2Icon": None,
    "Redo2Icon": None,
    "Maximize2Icon": "flex/solid/interface-essential/maximize-2.svg",
    "Minimize2Icon": "flex/solid/interface-essential/zoom-out.svg",
    "Wand2Icon": "flex/solid/interface-essential/magic-wand-2.svg",
    "LanguagesIcon": "flex/solid/work-education/dictionary-language-book.svg",
    "HomeIcon": "flex/solid/interface-essential/home-2.svg",
    "PhoneIcon": "flex/solid/phone/phone.svg",
    "CallIcon": "flex/solid/phone/phone-ringing-1.svg",
    "MapPinIcon": "flex/solid/map-travel/location-pin-3.svg",
    "UserIcon": "flex/solid/interface-essential/user-circle-single.svg",
    "LockIcon": "flex/solid/interface-essential/padlock-square-1.svg",
    "KeyRoundIcon": None,  # key fallback
    "HelpCircleIcon": "flex/solid/interface-essential/help-chat-1.svg",
    "PassportIcon": "flex/solid/map-travel/passport-globe.svg",
    "CarIcon": "flex/solid/map-travel/car-taxi-1.svg",
    "StarIcon": "flex/solid/interface-essential/star-circle.svg",
    "SupportIcon": "flex/solid/interface-essential/customer-support-5.svg",
}

# Minimal solid fallbacks in Streamline 14×14 coordinates (for missing free icons).
FALLBACKS: dict[str, list[dict]] = {
    "MenuIcon": [
        {"d": "M1.5 3.25h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1 0-1.5Zm0 3h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1 0-1.5Zm0 3h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1 0-1.5Z", "fillRule": "evenodd"},
    ],
    "ArrowRightIcon": [
        {"d": "M5.22 2.72a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06L9.19 7.5 5.22 3.78a.75.75 0 0 1 0-1.06Z", "fillRule": "evenodd"},
    ],
    "ArrowUpIcon": [
        {"d": "M7.53 2.22a.75.75 0 0 0-1.06 0l-4.5 4.5a.75.75 0 0 0 1.06 1.06L6.5 4.06v7.19a.75.75 0 0 0 1.5 0V4.06l3.47 3.72a.75.75 0 1 0 1.06-1.06l-4.5-4.5Z", "fillRule": "evenodd"},
    ],
    "ArrowDownIcon": [
        {"d": "M6.47 11.78a.75.75 0 0 0 1.06 0l4.5-4.5a.75.75 0 0 0-1.06-1.06L7.5 9.94V2.75a.75.75 0 0 0-1.5 0v7.19L2.53 6.22a.75.75 0 0 0-1.06 1.06l4.5 4.5Z", "fillRule": "evenodd"},
    ],
    "CheckIcon": [
        {"d": "M11.78 3.22a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06L5.75 8.19l4.97-4.97a.75.75 0 0 1 1.06 0Z", "fillRule": "evenodd"},
    ],
    "XIcon": [
        {"d": "M3.22 3.22a.75.75 0 0 1 1.06 0L7 5.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.06 7l2.72 2.72a.75.75 0 1 1-1.06 1.06L7 8.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L5.94 7 3.22 4.28a.75.75 0 0 1 0-1.06Z", "fillRule": "evenodd"},
    ],
    "MoreHorizontalIcon": [
        {"d": "M3.5 7A1.25 1.25 0 1 1 1 7a1.25 1.25 0 0 1 2.5 0Zm4.75 0A1.25 1.25 0 1 1 7 7a1.25 1.25 0 0 1 2.5 0ZM14 7a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 14 7Z"},
    ],
    "MoreHorizontalCircleIcon": [
        {"d": "M7 0.75a6.25 6.25 0 1 0 0 12.5A6.25 6.25 0 0 0 7 0.75ZM3.75 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm2.5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm2.5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z", "fillRule": "evenodd"},
    ],
    "KeyRoundIcon": [
        {"d": "M8.5 1.25a4.25 4.25 0 0 0-3.9 5.95L1.47 10.33a.75.75 0 0 0 0 1.06l1.14 1.14a.75.75 0 0 0 1.06 0l.47-.47.53.53a.75.75 0 0 0 1.06 0l1.5-1.5.01-.01 1.12-1.12A4.25 4.25 0 1 0 8.5 1.25Zm0 2.5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z", "fillRule": "evenodd"},
    ],
    "BoldIcon": [
        {"d": "M3.5 1.75h4.05c1.85 0 3.2 1.15 3.2 2.85 0 1.15-.7 2.05-1.75 2.45 1.35.35 2.3 1.4 2.3 2.9 0 1.85-1.5 3.15-3.7 3.15H3.5V1.75Zm1.7 1.5v2.85h2.25c.95 0 1.5-.55 1.5-1.4s-.55-1.45-1.55-1.45H5.2Zm0 4.35v3.4h2.55c1.15 0 1.85-.65 1.85-1.7s-.7-1.7-1.9-1.7H5.2Z", "fillRule": "evenodd"},
    ],
    "ItalicIcon": [
        {"d": "M8.35 1.75h3.4v1.5H10.2L7.15 10.75h1.95v1.5H3.25v-1.5h1.9L8.2 3.25H6.35v-1.5h2Z", "fillRule": "evenodd"},
    ],
    "UnderlineIcon": [
        {"d": "M3.75 1.75h1.6v5.6c0 1.55 1.05 2.6 2.65 2.6s2.65-1.05 2.65-2.6v-5.6h1.6v5.6c0 2.4-1.75 4.1-4.25 4.1S3.75 9.75 3.75 7.35v-5.6ZM3.25 12.1h7.5v1.5h-7.5V12.1Z", "fillRule": "evenodd"},
    ],
    "StrikethroughIcon": [
        {"d": "M7.85 3.05c.95 0 1.55.5 1.55 1.25 0 .35-.1.65-.35.9h1.75c.35-.5.55-1.1.55-1.75 0-1.5-1.2-2.45-3.2-2.45H4.2v1.55h2.95c.45 0 .7.2.7.5Zm-5.1 3.55h8.5v1.45h-8.5V6.6Zm2.55 2.35v1.7h1.85c.55 0 .9.25.9.7 0 .5-.4.8-1.05.8H4.2v1.55h2.85c1.95 0 3.15-.95 3.15-2.45 0-.55-.15-1-.45-1.35-.2-.2-.45-.35-.75-.45H5.3Z", "fillRule": "evenodd"},
    ],
    "Undo2Icon": [
        {"d": "M5.47 2.22a.75.75 0 0 1 0 1.06L3.56 5.19H9.5a3.75 3.75 0 1 1 0 7.5H7a.75.75 0 0 1 0-1.5h2.5a2.25 2.25 0 1 0 0-4.5H3.56l1.91 1.91a.75.75 0 1 1-1.06 1.06l-3.25-3.25a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z", "fillRule": "evenodd"},
    ],
    "Redo2Icon": [
        {"d": "M8.53 2.22a.75.75 0 0 0 0 1.06l1.91 1.91H4.5a3.75 3.75 0 1 0 0 7.5H7a.75.75 0 0 0 0-1.5H4.5a2.25 2.25 0 1 1 0-4.5h5.94L8.53 8.1a.75.75 0 1 0 1.06 1.06l3.25-3.25a.75.75 0 0 0 0-1.06L9.59 2.22a.75.75 0 0 0-1.06 0Z", "fillRule": "evenodd"},
    ],
}

PATH_RE = re.compile(
    r"<path\b([^>]*)/?>",
    re.IGNORECASE,
)
ATTR_RE = re.compile(r'([a-zA-Z_:][-a-zA-Z0-9_:]*)\s*=\s*"([^"]*)"')

ctx = ssl.create_default_context()


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "pnk-mail-icon-gen"})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as res:
        return res.read().decode("utf-8")


def parse_paths(svg: str) -> list[dict]:
    out: list[dict] = []
    for m in PATH_RE.finditer(svg):
        attrs = dict(ATTR_RE.findall(m.group(1)))
        d = attrs.get("d")
        if not d:
            continue
        item: dict = {"d": d}
        fr = attrs.get("fill-rule") or attrs.get("fillRule")
        if fr:
            item["fillRule"] = fr
        cr = attrs.get("clip-rule") or attrs.get("clipRule")
        if cr:
            item["clipRule"] = cr
        out.append(item)
    return out


def emit_ts(name: str, paths: list[dict]) -> str:
    payload = json.dumps(paths, ensure_ascii=False)
    return f"export const {name} = {payload} as const;\n"


def main() -> None:
    cache: dict[str, list[dict]] = {}
    lines = [
        "/** Auto-generated from Streamline Flex Solid — do not edit by hand. */",
        "/** Source: https://github.com/webalys-hq/streamline-vectors/tree/main/flex/solid */",
        "export type StreamlinePath = {",
        "  d: string;",
        '  fillRule?: "evenodd" | "nonzero" | string;',
        '  clipRule?: "evenodd" | "nonzero" | string;',
        "};",
        "",
    ]

    for name, rel in MAP.items():
        if rel is None:
            paths = FALLBACKS[name]
            print(f"fallback  {name}")
        else:
            if rel not in cache:
                url = BASE + rel
                print(f"fetch     {rel}")
                svg = fetch(url)
                paths = parse_paths(svg)
                if not paths:
                    raise SystemExit(f"No paths in {rel}")
                cache[rel] = paths
                time.sleep(0.05)
            paths = cache[rel]
        lines.append(emit_ts(name, paths))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(MAP)} icons)")


if __name__ == "__main__":
    main()
