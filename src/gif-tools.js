import {
  fileInput,
  onFile,
  field,
  button,
  val,
  num,
  bindRun,
  download,
  requireFiles,
  assertRange,
} from "./utils.js";
export function mountGif(root, tool) {
  let files = [],
    result,
    objectUrl;
  root.innerHTML =
    fileInput("image/gif") +
    `<div class="form-grid">${tool.id === "gifscaler" ? field("width", "输出宽度（px）", 300, "number") : tool.id === "gifcropper" ? field("x", "左上角 X", 0, "number") + field("y", "左上角 Y", 0, "number") + field("width", "裁剪宽度（px）", 200, "number") + field("height", "裁剪高度（px）", 200, "number") : ""}</div><div class="toolbar">${button(tool.id === "gifsplitter" ? "分割为 PNG ZIP" : "处理动画")}${button("下载结果", "download", true)}</div><pre id="result" class="result-box">请选择 GIF 文件（建议小于 20 MB）</pre><div class="output-preview"><img id="preview" alt="动画处理预览" hidden></div>`;
  onFile(root, (selected) => (files = selected));
  root.querySelector("#download").onclick = () => {
    if (result)
      download(
        result,
        tool.id === "gifsplitter" ? "gif-frames.zip" : tool.id + ".gif",
      );
  };
  bindRun(root, async () => {
    requireFiles(files);
    if (files[0].size > 50 * 1024 * 1024) throw Error("GIF 最大 50 MB");
    const { parseGIF, decompressFrames } = await import("gifuct-js");
    const parsed = parseGIF(await files[0].arrayBuffer()),
      frames = decompressFrames(parsed, true);
    if (!frames.length) throw Error("没有 GIF 图像帧");
    const originalW = parsed.lsd.width,
      originalH = parsed.lsd.height;
    if (originalW * originalH * frames.length > 150e6)
      throw Error("动画过大，请使用更小的文件");
    let x = 0,
      y = 0,
      w = originalW,
      h = originalH;
    if (tool.id === "gifscaler") {
      w = num(root, "width");
      assertRange(w, 1, 4000, "宽度");
      h = Math.round((originalH * w) / originalW);
    }
    if (tool.id === "gifcropper") {
      x = num(root, "x");
      y = num(root, "y");
      w = num(root, "width");
      h = num(root, "height");
      if (
        x < 0 ||
        y < 0 ||
        w <= 0 ||
        h <= 0 ||
        x + w > originalW ||
        y + h > originalH
      )
        throw Error("裁剪区域超出原图");
    }
    if (w * h * frames.length > 150e6 || h < 1)
      throw Error("输出动画过大或尺寸无效");
    const canvas = document.createElement("canvas");
    canvas.width = originalW;
    canvas.height = originalH;
    const ctx = canvas.getContext("2d");
    const patch = document.createElement("canvas"),
      pctx = patch.getContext("2d");
    const output = document.createElement("canvas");
    output.width = w;
    output.height = h;
    const outctx = output.getContext("2d");
    const { default: JSZip } = await import("jszip");
    const zip = tool.id === "gifsplitter" ? new JSZip() : null;
    let encoder, quantize, applyPalette;
    if (!zip) {
      const G = await import("gifenc");
      const factory = G.GIFEncoder || G.default?.GIFEncoder || G.default;
      quantize = G.quantize || G.default?.quantize;
      applyPalette = G.applyPalette || G.default?.applyPalette;
      encoder = factory();
    }
    let previous, restore;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (previous?.disposalType === 2)
        ctx.clearRect(
          previous.dims.left,
          previous.dims.top,
          previous.dims.width,
          previous.dims.height,
        );
      else if (previous?.disposalType === 3 && restore)
        ctx.putImageData(restore, 0, 0);
      const snapshot =
        frame.disposalType === 3
          ? ctx.getImageData(0, 0, originalW, originalH)
          : null;
      patch.width = frame.dims.width;
      patch.height = frame.dims.height;
      pctx.putImageData(
        new ImageData(frame.patch, frame.dims.width, frame.dims.height),
        0,
        0,
      );
      ctx.drawImage(patch, frame.dims.left, frame.dims.top);
      outctx.clearRect(0, 0, w, h);
      if (tool.id === "gifscaler") outctx.drawImage(canvas, 0, 0, w, h);
      else outctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      if (zip) {
        const blob = await new Promise((resolve) => output.toBlob(resolve));
        zip.file("frame-" + String(i + 1).padStart(4, "0") + ".png", blob);
      } else {
        const pixels = outctx.getImageData(0, 0, w, h).data,
          palette = quantize(pixels, 256, {
            format: "rgba4444",
            oneBitAlpha: true,
          }),
          index = applyPalette(pixels, palette, "rgba4444");
        const transparentIndex = palette.findIndex((c) => c[3] === 0);
        encoder.writeFrame(index, w, h, {
          palette,
          delay: frame.delay || 100,
          repeat: 0,
          dispose: 2,
          transparent: transparentIndex >= 0,
          transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
        });
      }
      restore = snapshot;
      previous = frame;
      if (i % 10 === 0) {
        root.querySelector("#result").textContent =
          `处理中 ${i + 1}/${frames.length} 帧`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    result = zip
      ? await zip.generateAsync({ type: "blob" })
      : (encoder.finish(), new Blob([encoder.bytes()], { type: "image/gif" }));
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(zip ? files[0] : result);
    root.querySelector("#preview").src = objectUrl;
    root.querySelector("#preview").hidden = false;
    root.querySelector("#result").textContent =
      `已处理 ${frames.length} 帧，${w} × ${h}。点击下载结果。`;
  });
  return () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
}
