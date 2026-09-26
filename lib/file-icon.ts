/** Map filename / mime to a Brainly file-type icon under /file-icons. */

const EXT_ICON: Record<string, string> = {
  docx: "docx",
  doc: "doc",
  pdf: "pdf",
  xlsx: "xlsx",
  xls: "xls",
  pptx: "pptx",
  ppt: "ppt",
  zip: "zip",
  rar: "rar",
  "7z": "zip",
  txt: "txt",
  csv: "csv",
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  gif: "image",
  webp: "image",
  svg: "svg",
  mp3: "mp3",
  wav: "wav",
  mp4: "mp4",
  avi: "avi",
  mkv: "mkv",
  mpeg: "mpeg",
  mpg: "mpeg",
  mov: "video",
  webm: "video",
  psd: "psd",
  ai: "ai",
  fig: "fig",
  xml: "xml",
  json: "code",
  js: "code",
  ts: "code",
  tsx: "code",
  jsx: "code",
  html: "code",
  css: "code",
  py: "code",
  aep: "aep",
  indd: "indd",
};

export function fileExt(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name || "");
  return (m?.[1] || "").toLowerCase();
}

export function fileIconSrc(name: string, mime?: string): string {
  const ext = fileExt(name);
  if (ext && EXT_ICON[ext]) return `/file-icons/${EXT_ICON[ext]}.svg`;

  const t = (mime || "").toLowerCase();
  if (t.startsWith("image/")) return "/file-icons/image.svg";
  if (t.startsWith("audio/")) return "/file-icons/audio.svg";
  if (t.startsWith("video/")) return "/file-icons/video.svg";
  if (t.includes("pdf")) return "/file-icons/pdf.svg";
  if (t.includes("zip") || t.includes("compress")) return "/file-icons/zip.svg";
  if (t.includes("sheet") || t.includes("excel")) return "/file-icons/spreadsheet.svg";
  if (t.includes("word") || t.includes("document")) return "/file-icons/docx.svg";
  if (t.includes("presentation") || t.includes("powerpoint"))
    return "/file-icons/pptx.svg";
  return "/file-icons/file.svg";
}
