"""Extract Hugeicons Pro Rounded/Solid SVGs used by the app into a TS module."""
from __future__ import annotations

import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET

SRC = r"c:\Users\pnk\Downloads\Hugeicons Pro.zip"
OUT = r"f:\pnk-mail\lib\generated\solid-icons.ts"

# App export name -> SVG basename (no .svg)
MAP = {
    "Search": "search",
    "Menu": "menu-01",
    "ArrowRight": "arrow-right-01-round",
    "ArrowUp": "arrow-up-01-round",
    "ArrowDown": "arrow-down-01-round",
    "Check": "tick-02",
    "CheckCircle": "checkmark-circle-02",
    "X": "multiplication-sign",
    "Plus": "add-01",
    "Pencil": "edit-01",
    "Edit": "edit-02",
    "Camera": "camera-01",
    "Crown": "crown",
    "HardDrive": "hard-drive",
    "IdCard": "id-verified",
    "Mail": "mail-01",
    "MailOpen": "mail-open-02",
    "Inbox": "inbox",
    "Sent": "sent",
    "Forward": "forward-01",
    "Reply": "mail-reply-01",
    "Send": "mail-send-01",
    "Trash2": "delete-02",
    "Archive": "archive-01",
    "FolderInput": "folder-transfer",
    "Folder": "folder-01",
    "Paperclip": "attachment-01",
    "PaperclipAlt": "attachment-02",
    "Tag": "tag-01",
    "Clock": "clock-01",
    "Cloud": "cloud",
    "RefreshCw": "refresh",
    "Reload": "reload",
    "Settings": "setting-01",
    "ShieldAlert": "alert-02",
    "Shield": "security",
    "Sparkles": "sparkles",
    "Users": "user-group",
    "UserMultiple": "user-multiple",
    "LayoutGrid": "layout-grid",
    "Grid": "grid-view",
    "LogOut": "logout-01",
    "MoreHorizontal": "more-horizontal",
    "MoreHorizontalCircle": "more-horizontal-circle-01",
    "QrCode": "qr-code",
    "Loader2": "loading",
    "Globe": "global",
    "Info": "information-circle",
    "Save": "floppy-disk",
    "Login": "login-03",
    "Copy": "copy-01",
    "Share": "share-01",
    "Message": "message-01",
    "Bell": "notification-03",
    "FileText": "file-01",
    "ImageIcon": "image-01",
    "Link2": "link-01",
    "Unlink": "unlink-01",
    "Bold": "text-bold",
    "Italic": "text-italic",
    "Underline": "text-underline",
    "Strikethrough": "text -strikethrough",
    "AlignLeft": "text-align-left",
    "AlignCenter": "text-align-center",
    "AlignRight": "text-align-right",
    "List": "left-to-right-list-bullet",
    "ListOrdered": "left-to-right-list-number",
    "Quote": "quote-down",
    "Smile": "smile",
    "Eraser": "eraser",
    "Highlighter": "color-picker",
    "Brush": "paint-brush-01",
    "Undo2": "rotate-left-01",
    "Redo2": "rotate-right-01",
    "Maximize2": "arrow-expand-01-round",
    "Minimize2": "arrow-shrink -01-round",
    "Wand2": "sparkles",
    "Languages": "language-circle",
    "Home": "home-01",
    "Phone": "smart-phone",
    "MapPin": "location-01",
    "User": "user",
    "Lock": "lock",
    "KeyRound": "lock-key",
    "HelpCircle": "help-circle",
    "Passport": "passport",
    "Car": "car-01",
    "Star": "star",
    "Support": "customer-support",
    "Call": "call",
}

ATTR_MAP = {
    "fill-rule": "fillRule",
    "clip-rule": "clipRule",
    "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "stroke-dasharray": "strokeDasharray",
    "stroke-miterlimit": "strokeMiterlimit",
    "fill-opacity": "fillOpacity",
    "stroke-opacity": "strokeOpacity",
    "class": "className",
}

SKIP_TAGS = {"svg", "defs", "clipPath", "mask", "title", "desc", "style"}
KEEP_TAGS = {"path", "circle", "rect", "ellipse", "line", "polyline", "polygon"}


def camel(attr: str) -> str:
    return ATTR_MAP.get(attr, attr)


def parse_svg(data: bytes) -> list:
    text = data.decode("utf-8")
    text = re.sub(r'\sxmlns="[^"]+"', "", text)
    text = re.sub(r'\sxmlns:xlink="[^"]+"', "", text)
    root = ET.fromstring(text)
    elements: list = []
    key = 0
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        if tag in SKIP_TAGS or tag not in KEEP_TAGS:
            continue
        attrs: dict = {}
        for k, v in el.attrib.items():
            k = k.split("}")[-1]
            if k in ("id", "xmlns"):
                continue
            ck = camel(k)
            if ck in ("fill", "stroke") and v.lower() not in ("none", "currentcolor") and (
                v.startswith("#") or v.startswith("rgb")
            ):
                v = "currentColor"
            attrs[ck] = v
        if tag != "g":
            if "fill" not in attrs and "stroke" not in attrs:
                attrs["fill"] = "currentColor"
            elif attrs.get("fill") and attrs["fill"] not in ("none", "currentColor") and not str(
                attrs["fill"]
            ).startswith("url"):
                attrs["fill"] = "currentColor"
        attrs["key"] = str(key)
        key += 1
        elements.append([tag, attrs])
    return elements


def main() -> None:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(SRC) as z:
        index: dict[str, str] = {}
        for n in z.namelist():
            if (
                not n.startswith("25,000+ SVG icons/Rounded/Solid/")
                or not n.endswith(".svg")
                or "__MACOSX" in n
            ):
                continue
            base = n.rsplit("/", 1)[-1][:-4]
            index[base] = n

        missing: list[tuple[str, str]] = []
        icons: dict[str, list] = {}
        for export, base in MAP.items():
            path = index.get(base)
            if not path:
                missing.append((export, base))
                continue
            icons[export] = parse_svg(z.read(path))

    lines = [
        "/** Auto-generated from Hugeicons Pro Rounded/Solid — do not edit by hand. */",
        'import type { IconSvgElement } from "@hugeicons/react";',
        "",
    ]
    for name, data in icons.items():
        js = json.dumps(data, ensure_ascii=False)
        lines.append(f"export const {name}Icon = {js} as unknown as IconSvgElement;")
        lines.append("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")
    print(f"icons: {len(icons)}")
    if missing:
        print("MISSING:")
        for export, base in missing:
            print(f"  {export} <- {base}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
