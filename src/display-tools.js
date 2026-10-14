import {
  field,
  select,
  button,
  val,
  num,
  escapeHtml,
  assertRange,
  notify,
} from "./utils.js";
export function mountDisplay(root, tool) {
  let raf,
    startTime,
    paused = false,
    offset = 0,
    last,
    active = false;
  const isDanmu = tool.id === "danmu";
  root.innerHTML = `<div class="form-grid">${field("font", "字号", isDanmu ? 100 : 48, "number", 'min="12" max="300"')}${field("speed", "速度（px/秒）", isDanmu ? 100 : 35, "number", 'min="5" max="500"')}${field("color", "文字颜色", "#ffffff", "color")}${field("background", "背景", "#151515", "color")}</div><label class="field wide"><span>显示内容</span><textarea id="input" rows="8">${isDanmu ? "你好，世界！" : "欢迎使用提词器。\n\n在这里输入你的台词。\n\n点击开始后，文字会按设定速度自动向上滚动。\n\n可使用空格键暂停，Esc 退出。"}</textarea></label><div class="toolbar">${button("开始显示", "start")}</div><div id="stage" class="display-stage" hidden><div class="stage-controls"><button id="pause" class="btn secondary">暂停 / 继续（空格）</button><button id="fullscreen" class="btn secondary">全屏</button><button id="exit" class="btn secondary">退出（Esc）</button></div><div id="display-text" class="${isDanmu ? "danmu-text" : "prompter-text"}"></div></div>`;
  const stage = root.querySelector("#stage"),
    text = root.querySelector("#display-text");
  function stop() {
    active = false;
    cancelAnimationFrame(raf);
    stage.hidden = true;
    if (document.fullscreenElement === stage)
      document.exitFullscreen().catch(() => {});
  }
  function tick(time) {
    if (!active) return;
    if (!last) last = time;
    const delta = (time - last) / 1000;
    last = time;
    if (!paused) {
      offset += delta * num(root, "speed");
      if (isDanmu) {
        const total = stage.clientWidth + text.scrollWidth;
        offset %= total;
        text.style.transform = `translateX(${stage.clientWidth - offset}px)`;
      } else {
        text.style.transform = `translateY(${stage.clientHeight - offset}px)`;
        if (offset > stage.clientHeight + text.scrollHeight) offset = 0;
      }
    }
    raf = requestAnimationFrame(tick);
  }
  root.querySelector("#start").onclick = () => {
    try {
      assertRange(num(root, "font"), 12, 300, "字号");
      assertRange(num(root, "speed"), 5, 500, "速度");
      if (!val(root, "input").trim()) throw Error("请输入内容");
      text.textContent = val(root, "input");
      text.style.color = val(root, "color");
      text.style.fontSize = num(root, "font") + "px";
      stage.style.background = val(root, "background");
      stage.hidden = false;
      paused = false;
      offset = 0;
      last = null;
      active = true;
      raf = requestAnimationFrame(tick);
    } catch (e) {
      notify(e.message, true);
    }
  };
  root.querySelector("#pause").onclick = () => (paused = !paused);
  root.querySelector("#exit").onclick = stop;
  root.querySelector("#fullscreen").onclick = () =>
    stage.requestFullscreen?.().catch(() => notify("浏览器未允许全屏", true));
  function key(e) {
    if (!active) return;
    if (e.key === "Escape") stop();
    if (e.code === "Space") {
      e.preventDefault();
      paused = !paused;
    }
  }
  document.addEventListener("keydown", key);
  return () => {
    stop();
    document.removeEventListener("keydown", key);
  };
}
export function mountTimer(root) {
  let timers = [],
    counter = 0,
    context;
  root.innerHTML = `<div class="toolbar">${field("name", "名称", "计时器")}${field("seconds", "秒数", 60, "number", 'min="1" max="86400"')}${button("添加计时器", "add")}</div><div id="timers" class="timer-grid"></div><p class="muted">多个倒计时可独立开始和暂停。页面关闭后停止计时。</p>`;
  function render() {
    root.querySelector("#timers").innerHTML =
      timers
        .map(
          (t) =>
            `<div class="timer-card ${t.done ? "timer-done" : ""}"><h3>${escapeHtml(t.name)}</h3><strong>${String(Math.floor(t.remaining / 60)).padStart(2, "0")}:${String(Math.ceil(t.remaining % 60)).padStart(2, "0")}</strong><div class="toolbar"><button class="btn" data-action="toggle" data-id="${t.id}">${t.running ? "暂停" : t.done ? "重新开始" : "开始"}</button><button class="btn secondary" data-action="reset" data-id="${t.id}">重置</button><button class="btn secondary" data-action="remove" data-id="${t.id}">删除</button></div>${t.done ? "<span>时间到！</span>" : ""}</div>`,
        )
        .join("") ||
      '<div class="empty-state">还没有计时器，添加一个开始吧。</div>';
  }
  root.querySelector("#add").onclick = () => {
    try {
      const seconds = num(root, "seconds");
      assertRange(seconds, 1, 86400, "秒数");
      if (timers.length >= 20) throw Error("最多添加 20 个计时器");
      timers.push({
        id: ++counter,
        name: val(root, "name") || "计时器",
        total: seconds,
        remaining: seconds,
        running: false,
        done: false,
      });
      render();
    } catch (e) {
      notify(e.message, true);
    }
  };
  root.querySelector("#timers").onclick = (e) => {
    const button = e.target.closest("[data-action]");
    if (!button) return;
    const timer = timers.find((t) => t.id === Number(button.dataset.id));
    if (!timer) return;
    if (button.dataset.action === "remove")
      timers = timers.filter((t) => t !== timer);
    else if (button.dataset.action === "reset") {
      timer.remaining = timer.total;
      timer.done = false;
      timer.running = false;
    } else {
      if (timer.done) {
        timer.remaining = timer.total;
        timer.done = false;
      }
      timer.running = !timer.running;
      timer.deadline = Date.now() + timer.remaining * 1000;
      if (timer.running) {
        context ??= new AudioContext();
        context.resume();
      }
    }
    render();
  };
  const interval = setInterval(() => {
    let changed = false;
    for (const t of timers)
      if (t.running) {
        const previous = Math.ceil(t.remaining);
        t.remaining = Math.max(0, (t.deadline - Date.now()) / 1000);
        if (previous !== Math.ceil(t.remaining)) changed = true;
        if (t.remaining === 0) {
          t.running = false;
          t.done = true;
          changed = true;
          if (context) {
            const osc = context.createOscillator(),
              gain = context.createGain();
            osc.frequency.value = 880;
            gain.gain.value = 0.15;
            osc.connect(gain);
            gain.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.4);
          }
        }
      }
    if (changed) render();
  }, 100);
  render();
  return () => {
    clearInterval(interval);
    context?.close();
  };
}
