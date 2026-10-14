import {
  field,
  select,
  button,
  val,
  num,
  download,
  canvasBlob,
  notify,
  assertRange,
} from "./utils.js";
export function mountDraw(root, tool) {
  const transparent = tool.id === "signature";
  root.innerHTML = `<div class="toolbar">${field("color", "画笔颜色", "#222222", "color")}${field("width", "画笔粗细", transparent ? 3 : 4, "number", 'min="1" max="50"')}${select("mode", "工具", ["画笔", "橡皮擦"])}${button("撤销", "undo", true)}${button("清空", "clear", true)}${button("下载 PNG", "download")}</div><div class="canvas-preview drawing ${transparent ? "checkerboard" : ""}"><canvas id="canvas" width="1200" height="700" aria-label="${tool.name}画布"></canvas></div><p class="muted">在画布上拖动鼠标或手指绘制。${transparent ? "导出的签名背景透明。" : ""}</p>`;
  const canvas = root.querySelector("#canvas"),
    ctx = canvas.getContext("2d");
  let strokes = [],
    current;
  function reset() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!transparent) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  function paint(stroke) {
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = stroke.erase
      ? "destination-out"
      : "source-over";
    const points = stroke.points;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    if (points.length === 1) {
      ctx.lineTo(points[0][0] + 0.01, points[0][1] + 0.01);
    } else points.slice(1).forEach((p) => ctx.lineTo(...p));
    ctx.stroke();
    ctx.restore();
  }
  function render() {
    reset();
    strokes.forEach(paint);
    if (current) paint(current);
  }
  function point(e) {
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) * canvas.width) / rect.width,
      ((e.clientY - rect.top) * canvas.height) / rect.height,
    ];
  }
  canvas.onpointerdown = (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    let width = num(root, "width");
    if (!Number.isFinite(width) || width < 1 || width > 50) width = 4;
    current = {
      points: [point(e)],
      color: val(root, "color"),
      width,
      erase: val(root, "mode") === "橡皮擦",
    };
    render();
  };
  canvas.onpointermove = (e) => {
    if (current) {
      current.points.push(point(e));
      render();
    }
  };
  const end = () => {
    if (current) {
      strokes.push(current);
      current = null;
    }
  };
  canvas.onpointerup = end;
  canvas.onpointercancel = end;
  root.querySelector("#undo").onclick = () => {
    strokes.pop();
    render();
  };
  root.querySelector("#clear").onclick = () => {
    strokes = [];
    render();
  };
  root.querySelector("#download").onclick = async () => {
    if (!strokes.length) return notify("请先绘制内容", true);
    download(await canvasBlob(canvas), tool.id + ".png");
  };
  reset();
}
