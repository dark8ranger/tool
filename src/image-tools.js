import {
  field,
  select,
  button,
  val,
  num,
  fileInput,
  onFile,
  readImage,
  canvasBlob,
  bindRun,
  download,
  requireFiles,
  escapeHtml,
  assertRange,
  notify,
  copy,
} from "./utils.js";
const generated = new Set([
  "imageholder",
  "emailimage",
  "qrcode",
  "barcode",
  "gridpaper",
  "copybook",
]);
const many = new Set(["collage", "stitch"]);
function config(id) {
  switch (id) {
    case "collage":
      return (
        field("columns", "列数", 2, "number") +
        field("cell", "单格宽度（px）", 600, "number") +
        field("gap", "图片间距（px）", 12, "number") +
        field("background", "背景", "#ffffff", "color")
      );
    case "stitch":
      return (
        select("direction", "排列方向", ["纵向", "横向"]) +
        field("cell", "统一宽 / 高（px）", 800, "number") +
        field("gap", "间距（px）", 0, "number")
      );
    case "watermark":
      return (
        field("text", "水印文字", "© 我的图片") +
        field("font", "字号（px）", 32, "number") +
        field("color", "文字颜色", "#ffffff", "color") +
        field(
          "opacity",
          "不透明度（0–1）",
          0.6,
          "number",
          'step="0.1" min="0" max="1"',
        ) +
        select("mode", "位置", ["右下角", "居中", "平铺"])
      );
    case "avatar":
      return (
        select("theme", "主题", [
          ["春节", "春节"],
          ["国庆", "国庆"],
          ["圣诞", "圣诞"],
        ]) + field("size", "输出大小（px）", 512, "number")
      );
    case "favicon":
      return (
        select("size", "尺寸", [16, 32, 48, 64, 128, 256]) +
        select("format", "输出", ["ICO", "PNG"])
      );
    case "base64image":
      return `<label class="field wide"><span>或粘贴 Data URL</span><textarea id="dataurl" rows="4" placeholder="data:image/png;base64,…"></textarea></label>`;
    case "imageholder":
      return (
        field("width", "宽（px）", 600, "number") +
        field("height", "高（px）", 400, "number") +
        field("text", "文字", "600 × 400") +
        field("background", "背景", "#eeeeee", "color") +
        field("color", "文字颜色", "#999999", "color")
      );
    case "emailimage":
      return (
        field("text", "邮件地址", "hello@example.com") +
        field("font", "字号（px）", 24, "number") +
        field("background", "背景", "#ffffff", "color") +
        field("color", "文字颜色", "#559c78", "color")
      );
    case "tinyimage":
      return (
        field("maxwidth", "最大宽度（px；0 为原尺寸）", 1920, "number") +
        field(
          "quality",
          "质量（0.1–1）",
          0.8,
          "number",
          'step="0.1" min="0.1" max="1"',
        ) +
        select("format", "格式", ["JPEG", "WebP", "PNG"])
      );
    case "qrcode":
      return (
        field("text", "内容", "https://example.com") +
        field("size", "尺寸（px）", 300, "number") +
        select("level", "纠错等级", ["M", "L", "Q", "H"]) +
        field("color", "前景色", "#222222", "color") +
        field("background", "背景色", "#ffffff", "color")
      );
    case "barcode":
      return (
        field("text", "内容", "123456789012") +
        select("format", "编码", [
          "CODE128",
          "EAN13",
          "CODE39",
          "EAN8",
          "ITF",
          "UPC",
        ]) +
        field("height", "条码高度（px）", 100, "number")
      );
    case "imageconverter":
      return select("format", "输出格式", ["PNG", "JPEG", "WebP"]);
    case "appicon":
      return field(
        "sizes",
        "图标尺寸（逗号分隔）",
        "16,32,48,64,128,256,512,1024",
      );
    case "imagecropper":
      return (
        select("preset", "规格", [
          ["custom", "自定义"],
          ["one", "一寸 295 × 413"],
          ["two", "二寸 413 × 579"],
        ]) +
        field("x", "裁剪左上角 X", 0, "number") +
        field("y", "裁剪左上角 Y", 0, "number") +
        field("width", "裁剪宽度（px）", 300, "number") +
        field("height", "裁剪高度（px）", 400, "number")
      );
    case "imageslicer":
      return (
        field("rows", "行数", 3, "number") +
        field("columns", "列数", 3, "number")
      );
    case "imageprint":
      return (
        select("paper", "相纸", [
          ["six", "六寸相纸 1800 × 1200"],
          ["a4", "A4 2480 × 3508"],
        ]) +
        select("preset", "照片规格", [
          ["one", "一寸 295 × 413"],
          ["two", "二寸 413 × 579"],
        ]) +
        field("gap", "间距（px）", 20, "number")
      );
    case "gridpaper":
      return (
        select("pattern", "图案", ["方格", "点阵", "六边形"]) +
        field("spacing", "间距（px）", 40, "number") +
        field("color", "线条颜色", "#aac7b8", "color")
      );
    case "copybook":
      return (
        field("text", "描红内容", "天地玄黄宇宙洪荒") +
        field("size", "每格尺寸（px）", 160, "number") +
        select("pinyin", "拼音", ["显示", "不显示"])
      );
  }
}
export function mountImage(root, tool) {
  let files = [],
    output,
    filename = tool.id + ".png";
  root.innerHTML =
    (generated.has(tool.id) ? "" : fileInput("image/*", many.has(tool.id))) +
    `<div class="form-grid">${config(tool.id) || ""}</div><div class="toolbar">${button("生成 / 处理")}${button("下载图片", "download", true)}${tool.id === "base64image" ? button("复制编码", "copy", true) : ""}</div><p id="status" class="muted"></p><div class="canvas-preview"><canvas id="canvas" width="600" height="360"></canvas></div>`;
  const canvas = root.querySelector("#canvas"),
    ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f8f8";
  ctx.fillRect(0, 0, 600, 360);
  ctx.fillStyle = "#a2aba6";
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("图片预览", 300, 180);
  if (!generated.has(tool.id))
    onFile(root, (selected) => {
      files = selected;
    });
  root.querySelector("#download").onclick = () => {
    if (!output) return notify("请先处理图片", true);
    download(output, filename, output.type);
  };
  root
    .querySelector("#copy")
    ?.addEventListener("click", () => copy(val(root, "dataurl")));
  if (tool.id === "imagecropper") {
    root.querySelector("#preset").onchange = () => {
      if (val(root, "preset") !== "custom") {
        root.querySelector("#width").value =
          val(root, "preset") === "one" ? 295 : 413;
        root.querySelector("#height").value =
          val(root, "preset") === "one" ? 413 : 579;
      }
    };
  }
  function resize(w, h) {
    w = Math.round(w);
    h = Math.round(h);
    if (w < 1 || h < 1 || w > 16000 || h > 16000 || w * h > 32e6)
      throw Error("输出图片尺寸无效或超过 3200 万像素");
    canvas.width = w;
    canvas.height = h;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  async function image() {
    requireFiles(files);
    return await readImage(files[0]);
  }
  bindRun(root, async () => {
    output = null;
    filename = tool.id + ".png";
    let mime = "image/png",
      quality = 0.9;
    const id = tool.id;
    if (id === "qrcode") {
      assertRange(num(root, "size"), 64, 4096, "尺寸");
      const { default: QRCode } = await import("qrcode");
      await QRCode.toCanvas(canvas, val(root, "text"), {
        width: num(root, "size"),
        errorCorrectionLevel: val(root, "level"),
        color: { dark: val(root, "color"), light: val(root, "background") },
      });
    } else if (id === "barcode") {
      assertRange(num(root, "height"), 20, 1000, "高度");
      const { default: JsBarcode } = await import("jsbarcode");
      JsBarcode(canvas, val(root, "text"), {
        format: val(root, "format"),
        height: num(root, "height"),
        displayValue: true,
        margin: 16,
      });
    } else if (id === "imageholder") {
      resize(num(root, "width"), num(root, "height"));
      ctx.fillStyle = val(root, "background");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = val(root, "color");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font =
        Math.max(12, Math.min(canvas.width / 10, canvas.height / 5, 72)) +
        "px sans-serif";
      ctx.fillText(
        val(root, "text"),
        canvas.width / 2,
        canvas.height / 2,
        canvas.width - 20,
      );
    } else if (id === "emailimage") {
      const size = num(root, "font");
      assertRange(size, 8, 200, "字号");
      ctx.font = size + "px monospace";
      const width = ctx.measureText(val(root, "text")).width + 32;
      resize(width, size * 2 + 16);
      ctx.fillStyle = val(root, "background");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = val(root, "color");
      ctx.font = size + "px monospace";
      ctx.textBaseline = "middle";
      ctx.fillText(val(root, "text"), 16, canvas.height / 2);
    } else if (id === "gridpaper") {
      assertRange(num(root, "spacing"), 8, 300, "间距");
      resize(1240, 1754);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = val(root, "color");
      ctx.fillStyle = val(root, "color");
      ctx.lineWidth = 1;
      const s = num(root, "spacing"),
        pattern = val(root, "pattern");
      if (pattern === "方格") {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += s) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y < canvas.height; y += s) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      } else if (pattern === "点阵") {
        for (let x = s; x < canvas.width; x += s)
          for (let y = s; y < canvas.height; y += s) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
      } else {
        const h = Math.sqrt(3) * s;
        for (let col = 0; col < canvas.width / (1.5 * s) + 1; col++)
          for (let row = 0; row < canvas.height / h + 1; row++) {
            const x = col * 1.5 * s,
              y = row * h + (col % 2 ? h / 2 : 0);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const px = x + s * Math.cos((i * Math.PI) / 3),
                py = y + s * Math.sin((i * Math.PI) / 3);
              i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
      }
    } else if (id === "copybook") {
      const chars = Array.from(val(root, "text")).filter((c) => !/\s/.test(c));
      if (!chars.length || chars.length > 1000)
        throw Error("请输入 1–1000 个字");
      const size = num(root, "size");
      assertRange(size, 60, 240, "格子大小");
      const columns = 6,
        withPinyin = val(root, "pinyin") === "显示",
        rowHeight = size + (withPinyin ? 48 : 0),
        rows = Math.ceil(chars.length / columns);
      resize(columns * size + 80, rows * rowHeight + 80);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      let py = [];
      if (withPinyin) {
        const { pinyin } = await import("pinyin-pro");
        py = pinyin(chars.join(""), { type: "array" });
      }
      chars.forEach((c, i) => {
        const x = 40 + (i % columns) * size,
          y = 40 + Math.floor(i / columns) * rowHeight + (withPinyin ? 48 : 0);
        ctx.strokeStyle = "#e6b3ad";
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, size, size);
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size / 2, y + size);
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x + size, y + size / 2);
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.stroke();
        ctx.fillStyle = "#bfbfbf";
        ctx.font = Math.floor(size * 0.7) + 'px "KaiTi", "STKaiti", serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c, x + size / 2, y + size / 2);
        if (withPinyin) {
          ctx.fillStyle = "#666";
          ctx.font = "24px sans-serif";
          ctx.fillText(py[i] || "", x + size / 2, y - 24);
        }
      });
    } else if (id === "collage" || id === "stitch") {
      requireFiles(files);
      if (files.length > 100) throw Error("最多选择 100 张图片");
      const imgs = await Promise.all(files.map(readImage));
      const cell = num(root, "cell"),
        gap = num(root, "gap");
      assertRange(cell, 32, 4096, "单格宽度");
      assertRange(gap, 0, 300, "间距");
      if (id === "collage") {
        const cols = num(root, "columns");
        assertRange(cols, 1, 20, "列数");
        if (!Number.isInteger(cols)) throw Error("列数必须是整数");
        resize(
          cols * cell + (cols + 1) * gap,
          Math.ceil(imgs.length / cols) * cell +
            (Math.ceil(imgs.length / cols) + 1) * gap,
        );
        ctx.fillStyle = val(root, "background");
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        imgs.forEach((img, i) => {
          const scale = Math.min(cell / img.width, cell / img.height),
            w = img.width * scale,
            h = img.height * scale;
          ctx.drawImage(
            img,
            gap + (i % cols) * (cell + gap) + (cell - w) / 2,
            gap + Math.floor(i / cols) * (cell + gap) + (cell - h) / 2,
            w,
            h,
          );
        });
      } else {
        const vertical = val(root, "direction") === "纵向";
        const sizes = imgs.map((img) =>
          vertical
            ? (img.height * cell) / img.width
            : (img.width * cell) / img.height,
        );
        resize(
          vertical
            ? cell
            : sizes.reduce((a, b) => a + b, 0) + gap * (imgs.length - 1),
          vertical
            ? sizes.reduce((a, b) => a + b, 0) + gap * (imgs.length - 1)
            : cell,
        );
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let offset = 0;
        imgs.forEach((img, i) => {
          ctx.drawImage(
            img,
            vertical ? 0 : offset,
            vertical ? offset : 0,
            vertical ? cell : sizes[i],
            vertical ? sizes[i] : cell,
          );
          offset += sizes[i] + gap;
        });
      }
    } else if (id === "base64image") {
      let img;
      if (files.length) {
        img = await image();
        const reader = new FileReader();
        const url = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(files[0]);
        });
        root.querySelector("#dataurl").value = url;
      } else {
        const url = val(root, "dataurl");
        if (!/^data:image\/(png|jpeg|webp|gif|bmp);base64,/i.test(url))
          throw Error(
            "请输入 PNG / JPEG / WebP / GIF / BMP 的 Base64 Data URL",
          );
        const response = await fetch(url);
        img = await readImage(await response.blob());
      }
      resize(img.width, img.height);
      ctx.drawImage(img, 0, 0);
    } else {
      const img = await image();
      if (id === "appicon") {
        const { default: JSZip } = await import("jszip");
        const sizes = val(root, "sizes").split(/[,，]/).map(Number);
        if (
          sizes.length > 30 ||
          sizes.some((n) => !Number.isInteger(n) || n < 1 || n > 4096)
        )
          throw Error("尺寸需为 1–4096 的整数，最多 30 个");
        const zip = new JSZip();
        for (const size of sizes) {
          resize(size, size);
          drawContain(ctx, img, size, size);
          zip.file("icon-" + size + ".png", await canvasBlob(canvas));
        }
        output = await zip.generateAsync({ type: "blob" });
        filename = "app-icons.zip";
      } else if (id === "imageslicer") {
        const rows = num(root, "rows"),
          cols = num(root, "columns");
        assertRange(rows, 1, 20, "行数");
        assertRange(cols, 1, 20, "列数");
        if (
          !Number.isInteger(rows) ||
          !Number.isInteger(cols) ||
          rows > img.height ||
          cols > img.width
        )
          throw Error("行列数须为整数并小于图片像素尺寸");
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (let row = 0; row < rows; row++)
          for (let col = 0; col < cols; col++) {
            const x = Math.floor((col * img.width) / cols),
              y = Math.floor((row * img.height) / rows),
              w = Math.floor(((col + 1) * img.width) / cols) - x,
              h = Math.floor(((row + 1) * img.height) / rows) - y;
            resize(w, h);
            ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
            zip.file(
              `tile-${row + 1}-${col + 1}.png`,
              await canvasBlob(canvas),
            );
          }
        output = await zip.generateAsync({ type: "blob" });
        filename = "image-tiles.zip";
      } else if (id === "imagecropper") {
        const x = num(root, "x"),
          y = num(root, "y"),
          w = num(root, "width"),
          h = num(root, "height");
        if (x < 0 || y < 0 || x + w > img.width || y + h > img.height)
          throw Error(`裁剪区域超出原图（${img.width} × ${img.height}）`);
        resize(w, h);
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      } else if (id === "imageprint") {
        const a4 = val(root, "paper") === "a4",
          w = val(root, "preset") === "one" ? 295 : 413,
          h = val(root, "preset") === "one" ? 413 : 579,
          gap = num(root, "gap");
        assertRange(gap, 0, 500, "间距");
        resize(a4 ? 2480 : 1800, a4 ? 3508 : 1200);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cols = Math.floor((canvas.width - gap) / (w + gap)),
          rows = Math.floor((canvas.height - gap) / (h + gap));
        if (!cols || !rows) throw Error("间距过大");
        for (let row = 0; row < rows; row++)
          for (let col = 0; col < cols; col++)
            drawCover(
              ctx,
              img,
              gap + col * (w + gap),
              gap + row * (h + gap),
              w,
              h,
            );
      } else if (id === "avatar") {
        const size = num(root, "size");
        resize(size, size);
        drawCover(ctx, img, 0, 0, size, size);
        const theme = val(root, "theme");
        ctx.strokeStyle = theme === "圣诞" ? "#1e8764" : "#d93835";
        ctx.lineWidth = size * 0.06;
        ctx.strokeRect(size * 0.03, size * 0.03, size * 0.94, size * 0.94);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(0, size * 0.78, size, size * 0.22);
        ctx.fillStyle = "#fff";
        ctx.font = size * 0.12 + "px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          theme === "圣诞"
            ? "圣诞快乐"
            : theme === "国庆"
              ? "国庆快乐"
              : "新春快乐",
          size / 2,
          size * 0.93,
        );
      } else if (id === "favicon") {
        const size = num(root, "size");
        resize(size, size);
        drawContain(ctx, img, size, size);
        if (val(root, "format") === "ICO") {
          const png = await canvasBlob(canvas);
          output = ico(await png.arrayBuffer(), size);
          filename = "favicon.ico";
        }
      } else {
        let w = img.width,
          h = img.height;
        if (id === "tinyimage") {
          const max = num(root, "maxwidth");
          assertRange(max, 0, 16000, "最大宽度");
          if (max > 0 && w > max) {
            h = Math.round((h * max) / w);
            w = max;
          }
          quality = num(root, "quality");
          assertRange(quality, 0.1, 1, "质量");
        }
        resize(w, h);
        if (id === "tinyimage" || id === "imageconverter") {
          mime = { PNG: "image/png", JPEG: "image/jpeg", WebP: "image/webp" }[
            val(root, "format")
          ];
          if (mime === "image/jpeg") {
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, w, h);
          }
          filename =
            tool.id +
            {
              "image/png": ".png",
              "image/jpeg": ".jpg",
              "image/webp": ".webp",
            }[mime];
        }
        ctx.drawImage(img, 0, 0, w, h);
        if (id === "watermark") {
          const font = num(root, "font"),
            opacity = num(root, "opacity");
          assertRange(font, 8, 500, "字号");
          assertRange(opacity, 0, 1, "不透明度");
          ctx.globalAlpha = opacity;
          ctx.fillStyle = val(root, "color");
          ctx.font = font + "px sans-serif";
          const text = val(root, "text"),
            mode = val(root, "mode");
          if (mode === "平铺") {
            for (let y = font * 2; y < h; y += font * 5)
              for (
                let x = font;
                x < w;
                x += Math.max(font * 8, ctx.measureText(text).width + font * 2)
              ) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 6);
                ctx.fillText(text, 0, 0);
                ctx.restore();
              }
          } else {
            ctx.textAlign = mode === "居中" ? "center" : "right";
            ctx.fillText(
              text,
              mode === "居中" ? w / 2 : w - font,
              mode === "居中" ? h / 2 : h - font,
            );
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    if (!output) output = await canvasBlob(canvas, mime, quality);
    root.querySelector("#status").textContent =
      `已生成 ${canvas.width} × ${canvas.height}，${(output.size / 1024).toFixed(1)} KB${files.length === 1 ? "，原文件 " + (files[0].size / 1024).toFixed(1) + " KB" : ""}。点击「下载图片」保存。`;
  });
  if (generated.has(tool.id)) root.querySelector("#run").click();
}
function drawContain(ctx, img, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  ctx.drawImage(
    img,
    (w - img.width * scale) / 2,
    (h - img.height * scale) / 2,
    img.width * scale,
    img.height * scale,
  );
}
function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height),
    sw = w / scale,
    sh = h / scale;
  ctx.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}
function ico(png, size) {
  const buffer = new ArrayBuffer(22),
    view = new DataView(buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  view.setUint8(6, size === 256 ? 0 : size);
  view.setUint8(7, size === 256 ? 0 : size);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, png.byteLength, true);
  view.setUint32(18, 22, true);
  return new Blob([buffer, png], { type: "image/x-icon" });
}
