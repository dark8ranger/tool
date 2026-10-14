export const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function notify(message, error = false) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = "toast show" + (error ? " error" : "");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 3500);
}
export function download(data, name, type = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function copy(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    notify("已复制");
  } catch {
    notify("无法访问剪贴板，请手动复制", true);
  }
}
export function fileInput(accept = "", multiple = false) {
  return `<label class="upload-zone"><span class="upload-icon">⇧</span><strong>点击选择${multiple ? "文件，可多选" : "文件"}</strong><span>文件只在本地处理，不会上传</span><input id="files" type="file" ${multiple ? "multiple" : ""} accept="${accept}"></label><div id="file-list" class="file-list"></div>`;
}
export function field(id, label, value = "", type = "text", extra = "") {
  return `<label class="field"><span>${label}</span><input id="${id}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`;
}
export function select(id, label, options) {
  return `<label class="field"><span>${label}</span><select id="${id}">${options
    .map((x) => {
      const [v, t] = Array.isArray(x) ? x : [x, x];
      return `<option value="${escapeHtml(v)}">${escapeHtml(t)}</option>`;
    })
    .join("")}</select></label>`;
}
export function onFile(root, handler) {
  const input = root.querySelector("#files");
  input.addEventListener("change", async () => {
    root.querySelector("#file-list").textContent = Array.from(input.files)
      .map((f) => `${f.name} · ${bytes(f.size)}`)
      .join(" / ");
    await handler(Array.from(input.files));
  });
}
export const val = (root, id) => root.querySelector("#" + id)?.value ?? "";
export const num = (root, id) => Number(val(root, id));
export const bytes = (n) =>
  n < 1024
    ? n + " B"
    : n < 1048576
      ? (n / 1024).toFixed(1) + " KB"
      : (n / 1048576).toFixed(2) + " MB";
export function button(text, id = "run", secondary = false) {
  return `<button id="${id}" class="btn${secondary ? " secondary" : ""}">${text}</button>`;
}
export function readImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取图片"));
    };
    img.src = url;
  });
}
export function canvasBlob(canvas, type = "image/png", quality = 0.85) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("图片导出失败"))),
      type,
      quality,
    ),
  );
}
export function bindRun(root, fn, id = "run") {
  root.querySelector("#" + id)?.addEventListener("click", async () => {
    const b = root.querySelector("#" + id);
    b.disabled = true;
    const original = b.textContent;
    b.textContent = "处理中…";
    try {
      await fn();
    } catch (e) {
      notify(e.message || "处理失败", true);
      const result = root.querySelector("#result");
      if (result) {
        if (result.tagName === "TEXTAREA") result.value = "错误：" + e.message;
        else result.textContent = "错误：" + e.message;
      }
    } finally {
      b.disabled = false;
      b.textContent = original;
    }
  });
}
export function requireFiles(files) {
  if (!files?.length) throw new Error("请先选择文件");
}
export function assertRange(n, min, max, label) {
  if (!Number.isFinite(n) || n < min || n > max)
    throw new Error(`${label}必须在 ${min}–${max} 之间`);
}
