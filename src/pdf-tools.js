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
} from "./utils.js";
export function parsePages(input, count) {
  if (!input.trim()) return Array.from({ length: count }, (_, i) => i);
  const pages = [];
  for (const part of input.split(/[,，]/)) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw Error("页码格式示例：1,3,5-8");
    const a = Number(m[1]),
      b = Number(m[2] || m[1]);
    if (a < 1 || b > count || b < a)
      throw Error(`页码必须在 1–${count} 范围内`);
    for (let p = a; p <= b; p++) pages.push(p - 1);
  }
  return pages;
}
export function mountPdf(root, tool) {
  let files = [];
  root.innerHTML =
    fileInput(
      tool.id === "image2pdf" ? "image/png,image/jpeg" : ".pdf",
      tool.id === "pdfmerger" || tool.id === "image2pdf",
    ) +
    `<div class="form-grid">${tool.id === "pdfsplitter" || tool.id === "pdfadjuster" ? field("pages", "页码 / 顺序（留空为全部）", "", "text", 'placeholder="例如 3,1,5-8"') : ""}${
      tool.id === "pdfadjuster"
        ? select("rotation", "旋转角度", [
            ["0", "不旋转"],
            ["90", "顺时针 90°"],
            ["180", "180°"],
            ["270", "顺时针 270°"],
          ])
        : ""
    }${tool.id === "pdfsplitter" ? select("mode", "输出形式", ["合并所选页", "每页单独 PDF（ZIP）"]) : ""}${tool.id === "pdfpagenum" ? field("start", "起始编号", 1, "number") + select("position", "位置", ["底部居中", "底部左侧", "底部右侧"]) : ""}${tool.id === "image2pdf" ? select("paper", "页面尺寸", ["适应图片", "A4"]) : ""}</div><div class="toolbar">${button("处理并下载")}</div><pre id="result" class="result-box">请先选择文件。PDF 加密文件不支持处理。</pre>`;
  onFile(root, async (selected) => {
    files = selected;
    if (!files.length) return;
    try {
      if (tool.id !== "image2pdf") {
        const { PDFDocument } = await import("pdf-lib");
        const docs = await Promise.all(
          files.map(async (f) => await PDFDocument.load(await f.arrayBuffer())),
        );
        root.querySelector("#result").textContent = files
          .map((f, i) => `${i + 1}. ${f.name} · ${docs[i].getPageCount()} 页`)
          .join("\n");
      } else
        root.querySelector("#result").textContent = files
          .map((f, i) => `${i + 1}. ${f.name}`)
          .join("\n");
    } catch (e) {
      root.querySelector("#result").textContent = "无法读取 PDF：" + e.message;
    }
  });
  bindRun(root, async () => {
    requireFiles(files);
    const { PDFDocument, degrees, rgb, StandardFonts } =
      await import("pdf-lib");
    let doc = await PDFDocument.create();
    if (tool.id === "image2pdf") {
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const image =
          file.type === "image/png"
            ? await doc.embedPng(buffer)
            : await doc.embedJpg(buffer);
        const a4 = val(root, "paper") === "A4";
        const size = a4 ? [595.28, 841.89] : [image.width, image.height];
        const page = doc.addPage(size);
        const scale = Math.min(
          (size[0] - (a4 ? 40 : 0)) / image.width,
          (size[1] - (a4 ? 40 : 0)) / image.height,
        );
        const w = image.width * scale,
          h = image.height * scale;
        page.drawImage(image, {
          x: (size[0] - w) / 2,
          y: (size[1] - h) / 2,
          width: w,
          height: h,
        });
      }
    } else if (tool.id === "pdfmerger") {
      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await doc.copyPages(source, source.getPageIndices());
        pages.forEach((p) => doc.addPage(p));
      }
    } else {
      const source = await PDFDocument.load(await files[0].arrayBuffer());
      if (tool.id === "pdfpagenum") {
        doc = source;
        const start = num(root, "start");
        if (!Number.isInteger(start) || start < 0)
          throw Error("起始编号必须是非负整数");
        const font = await doc.embedFont(StandardFonts.Helvetica);
        doc.getPages().forEach((page, i) => {
          const text = String(start + i),
            width = font.widthOfTextAtSize(text, 12),
            x =
              val(root, "position") === "底部左侧"
                ? 24
                : val(root, "position") === "底部右侧"
                  ? page.getWidth() - width - 24
                  : (page.getWidth() - width) / 2;
          page.drawText(text, {
            x,
            y: 18,
            font,
            size: 12,
            color: rgb(0.3, 0.3, 0.3),
          });
        });
      } else {
        const selection = parsePages(val(root, "pages"), source.getPageCount());
        if (
          tool.id === "pdfsplitter" &&
          val(root, "mode") === "每页单独 PDF（ZIP）"
        ) {
          const { default: JSZip } = await import("jszip");
          const zip = new JSZip();
          for (let i = 0; i < selection.length; i++) {
            const single = await PDFDocument.create();
            const [page] = await single.copyPages(source, [selection[i]]);
            single.addPage(page);
            zip.file(
              `page-${selection[i] + 1}-${i + 1}.pdf`,
              await single.save(),
            );
          }
          download(await zip.generateAsync({ type: "blob" }), "pdf-pages.zip");
          root.querySelector("#result").textContent =
            `已导出 ${selection.length} 个 PDF 文件`;
          return;
        }
        const pages = await doc.copyPages(source, selection);
        pages.forEach((p) => {
          if (tool.id === "pdfadjuster")
            p.setRotation(
              degrees((p.getRotation().angle + num(root, "rotation")) % 360),
            );
          doc.addPage(p);
        });
      }
    }
    download(await doc.save(), tool.id + ".pdf", "application/pdf");
    root.querySelector("#result").textContent =
      `处理成功，共 ${doc.getPageCount()} 页。文件已开始下载。`;
  });
}
