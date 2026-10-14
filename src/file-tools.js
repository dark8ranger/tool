import {
  fileInput,
  onFile,
  field,
  select,
  button,
  val,
  num,
  bindRun,
  download,
  requireFiles,
  bytes,
  escapeHtml,
} from "./utils.js";
import { bdecode } from "./core.js";
export function mountFile(root, tool) {
  let files = [];
  const opts =
    tool.id === "renamer"
      ? field("prefix", "文件名前缀", "file_") +
        field("start", "起始序号", 1, "number") +
        field("digits", "序号位数", 3, "number", 'min="1" max="10"')
      : tool.id === "filehash"
        ? select("algorithm", "摘要算法", [
            "MD5",
            "SHA-1",
            "SHA-256",
            "SHA-512",
          ])
        : "";
  root.innerHTML =
    fileInput("", tool.id === "renamer" || tool.id === "filehash") +
    `<div class="toolbar">${opts}${button(tool.id === "renamer" ? "重命名并下载 ZIP" : "分析文件")}</div><pre id="result" class="result-box">请先选择文件</pre>`;
  onFile(root, (selected) => {
    files = selected;
    if (tool.id === "renamer") previewNames();
  });
  function rename(file, i) {
    const extension = file.name.includes(".")
      ? "." + file.name.split(".").pop()
      : "";
    const prefix = val(root, "prefix").replace(/[\\/:*?"<>|\x00-\x1f]/g, "_");
    const digits = num(root, "digits"),
      start = num(root, "start");
    if (
      !Number.isInteger(digits) ||
      digits < 1 ||
      digits > 10 ||
      !Number.isSafeInteger(start) ||
      start < 0
    )
      throw Error("序号位数为 1–10，起始序号为非负整数");
    return prefix + String(start + i).padStart(digits, "0") + extension;
  }
  function previewNames() {
    try {
      root.querySelector("#result").textContent = files
        .map((f, i) => `${f.name} → ${rename(f, i)}`)
        .join("\n");
    } catch (e) {
      root.querySelector("#result").textContent = e.message;
    }
  }
  if (tool.id === "renamer")
    root
      .querySelectorAll(".toolbar input")
      .forEach((x) => (x.oninput = previewNames));
  bindRun(root, async () => {
    requireFiles(files);
    const { default: C } = await import("crypto-js");
    if (tool.id === "renamer") {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      files.forEach((file, i) => zip.file(rename(file, i), file));
      download(await zip.generateAsync({ type: "blob" }), "renamed-files.zip");
      return;
    }
    let output = [];
    for (const file of files) {
      if (file.size > 512 * 1024 * 1024)
        throw Error("请选择小于 512 MB 的文件");
      const buffer = await file.arrayBuffer(),
        data = new Uint8Array(buffer);
      if (tool.id === "filehash") {
        const alg = val(root, "algorithm").replace("-", "");
        output.push({
          文件: file.name,
          大小: bytes(file.size),
          算法: val(root, "algorithm"),
          摘要: C[alg](C.lib.WordArray.create(data)).toString(),
        });
      } else if (tool.id === "magicbytes") {
        const hex = Array.from(data.slice(0, 64), (b) =>
          b.toString(16).padStart(2, "0"),
        )
          .join(" ")
          .toUpperCase();
        const prefix = hex.replace(/ /g, "");
        const signatures = {
          "89504E470D0A1A0A": "PNG",
          FFD8FF: "JPEG",
          47494638: "GIF",
          25504446: "PDF",
          "504B0304": "ZIP / Office Open XML",
          52617221: "RAR",
          "377ABCAF271C": "7-Zip",
          "49492A00": "TIFF (LE)",
          "4D4D002A": "TIFF (BE)",
          "424D": "BMP",
          "4D5A": "Windows executable",
          "7F454C46": "ELF executable",
          "00000100": "ICO",
          494433: "MP3 (ID3)",
          52494646: "RIFF（WAV / WEBP / AVI）",
        };
        output.push({
          文件: file.name,
          识别格式:
            Object.entries(signatures).find(([signature]) =>
              prefix.startsWith(signature),
            )?.[1] || "未知格式",
          文件头: hex,
        });
      } else if (tool.id === "imageinspector") {
        const img = await createImageBitmap(file);
        const info = {
          文件: file.name,
          大小: bytes(file.size),
          类型: file.type,
          宽度: img.width,
          高度: img.height,
        };
        img.close();
        if (file.type === "image/png") {
          const texts = pngText(data);
          if (Object.keys(texts).length) info.PNG文本元数据 = texts;
        }
        output.push(info);
      } else if (tool.id === "torrent") {
        const { result, info } = bdecode(buffer);
        if (!info.length || !result.info) throw Error("torrent 缺少 info 字典");
        const decode = (x) =>
          x instanceof Uint8Array ? new TextDecoder().decode(x) : x;
        const hash = C.SHA1(C.lib.WordArray.create(info)).toString(),
          name =
            decode(result.info["name.utf-8"] || result.info.name) || "unnamed";
        output.push({
          名称: name,
          InfoHash: hash,
          Magnet:
            "magnet:?xt=urn:btih:" + hash + "&dn=" + encodeURIComponent(name),
          Tracker: decode(result.announce) || "",
          总大小:
            result.info.length ??
            result.info.files?.reduce((n, f) => n + f.length, 0),
          文件列表: result.info.files?.map((f) => ({
            路径: f.path.map(decode).join("/"),
            大小: f.length,
          })),
        });
      }
    }
    root.querySelector("#result").textContent = JSON.stringify(output, null, 2);
  });
}
function pngText(data) {
  const out = {},
    view = new DataView(data.buffer);
  let p = 8;
  while (p + 12 <= data.length) {
    const length = view.getUint32(p),
      type = new TextDecoder().decode(data.slice(p + 4, p + 8));
    if (p + 12 + length > data.length) break;
    if (type === "tEXt") {
      const content = data.slice(p + 8, p + 8 + length);
      const at = content.indexOf(0);
      if (at >= 0)
        out[new TextDecoder("iso-8859-1").decode(content.slice(0, at))] =
          new TextDecoder("iso-8859-1").decode(content.slice(at + 1));
    }
    if (type === "iTXt") {
      const content = data.slice(p + 8, p + 8 + length);
      let at = content.indexOf(0);
      if (at >= 0 && content[at + 1] === 0) {
        const key = new TextDecoder().decode(content.slice(0, at));
        at += 3;
        at = content.indexOf(0, at) + 1;
        at = content.indexOf(0, at) + 1;
        if (at > 0) out[key] = new TextDecoder().decode(content.slice(at));
      }
    }
    p += length + 12;
  }
  return out;
}
