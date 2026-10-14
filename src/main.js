import "./style.css";
import "highlight.js/styles/github.css";
import { tools, categories, featured } from "./catalog.js";
import { navCategories, navGroups } from "./nav-data.js";
import { escapeHtml, notify } from "./utils.js";
const app = document.getElementById("app");
const favoritesKey = "toolbox-favorites-v1";
let favorites;
try {
  favorites = new Set(JSON.parse(localStorage.getItem(favoritesKey) || "[]"));
} catch {
  favorites = new Set();
}
let category = "所有",
  navCategory = "AI",
  query = "",
  favoriteOnly = false,
  dispose;
app.innerHTML = `<div class="utility-bar"><div class="site-width"><span>在线工具</span><span>你的工具箱</span></div></div><header class="site-header site-width"><a class="brand" href="#/tools"><img src="/favicon.svg" alt=""><span>在线工具</span></a><form class="search-box" id="search-form"><span class="search-icon">⌕</span><input id="search" aria-label="搜索工具或网址" placeholder="搜索其实很简单" autocomplete="off"><div class="search-tips"><button type="button" data-search="格式化">格式化</button><button type="button" data-search="图片">图片</button><button type="button" data-search="PDF">PDF</button></div><button type="submit" class="search-submit">搜索</button></form><div class="header-note"><strong>${tools.length}</strong><span>本地工具</span><span class="local-dot">● 无需登录</span></div></header><nav class="main-nav site-width" aria-label="主导航"><a href="#/tools" data-nav="tools">⚒ 工具</a><a href="#/nav" data-nav="nav">⌘ 网址</a><span class="nav-note">常用工具，一站即用</span></nav><main id="content" class="site-width"></main><footer class="site-width"><div><a href="#/tools">工具</a><span> · </span><a href="#/nav">网址</a></div><p>你的工具箱 · 文件在本地处理，无需上传</p><span>Copyright © ${new Date().getFullYear()} dark8ranger</span></footer><button id="back-top" class="back-top" aria-label="返回顶部" title="返回顶部">↑</button><div id="toast" role="status" aria-live="polite" class="toast"></div>`;
const content = document.getElementById("content");
function card(t) {
  const hue = (tools.indexOf(t) * 37 + 122) % 360;
  const saved = favorites.has(t.id);
  return `<article class="tool-card"><div class="card-top"><a class="tool-icon icon-${t.id}" style="--hue:${hue}" href="#/tool/${t.id}" tabindex="-1" aria-hidden="true">${escapeHtml(t.icon)}</a><div class="card-heading"><a class="tool-title" href="#/tool/${t.id}">${escapeHtml(t.name)}</a><button class="favorite${saved ? " is-saved" : ""}" data-favorite="${t.id}" aria-label="${saved ? "取消收藏" : "收藏"}${escapeHtml(t.name)}" aria-pressed="${saved}">${saved ? "★ 已收藏" : "☆ 加入收藏"}</button></div><button class="card-category" data-category="${t.category}">[${t.category}]</button></div><p class="card-desc">${escapeHtml(t.description)}</p><div class="card-bottom"><a class="card-url" href="#/tool/${t.id}">/${t.id}/</a><a class="enter" href="#/tool/${t.id}">进入</a></div></article>`;
}
function matches(t) {
  return (
    (category === "所有" || t.category === category) &&
    (!favoriteOnly || favorites.has(t.id)) &&
    (!query ||
      (t.name + " " + t.description + " " + t.id)
        .toLowerCase()
        .includes(query.toLowerCase()))
  );
}
function renderTools() {
  const list = tools.filter(matches);
  content.innerHTML = `<div class="category-bar" aria-label="工具分类">${categories.map((c) => `<button data-category="${c}" class="${category === c && !favoriteOnly ? "active" : ""}">${c}</button>`).join("")}<button class="favorites-tab ${favoriteOnly ? "active" : ""}" id="favorites">☆ 我的收藏 <small>${favorites.size}</small></button></div>${query ? `<div class="search-results">“${escapeHtml(query)}” 的搜索结果 · ${list.length} 个<button id="reset-search">清除搜索 ×</button></div>` : ""}<div class="tools-grid">${list.map(card).join("")}</div>${!list.length ? '<div class="empty-state"><strong>没有找到工具</strong><p>试试其他关键词，或切换分类。</p><button class="btn secondary" id="reset-filter">查看所有工具</button></div>' : ""}`;
  content.querySelector("#favorites").onclick = () => {
    favoriteOnly = !favoriteOnly;
    category = "所有";
    renderTools();
  };
  content
    .querySelector("#reset-search")
    ?.addEventListener("click", clearSearch);
  content.querySelector("#reset-filter")?.addEventListener("click", () => {
    category = "所有";
    favoriteOnly = false;
    clearSearch();
  });
}
function clearSearch() {
  query = "";
  document.getElementById("search").value = "";
  renderCurrent();
}
function renderNav() {
  const groups = navGroups.filter((g) =>
    query
      ? g.sites.some((s) =>
          (s.name + s.description + s.url)
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
      : g.category === navCategory,
  );
  content.innerHTML = `<div class="category-bar">${navCategories.map((c) => `<button data-nav-category="${c}" class="${c === navCategory && !query ? "active" : ""}">${c}</button>`).join("")}</div>${query ? `<div class="search-results">“${escapeHtml(query)}” 的网址搜索结果<button id="reset-search">清除搜索 ×</button></div>` : ""}<div class="nav-layout"><div class="nav-groups">${
    groups
      .map(
        (g, i) =>
          `<section id="nav-section-${i}" class="nav-section"><h2><span>▪</span> ${g.name}${query ? " <small> · " + g.category + "</small>" : ""}</h2><div class="sites-grid">${g.sites
            .filter(
              (s) =>
                !query ||
                (s.name + s.description + s.url)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map(
              (s, j) =>
                `<a class="site-card" href="${s.url}" target="_blank" rel="noopener noreferrer"><div><span class="site-icon" style="--hue:${(j * 43 + 130) % 360}">${escapeHtml(s.name.slice(0, 1))}</span><strong>${escapeHtml(s.name)}</strong><span class="external-icon">↗</span></div><p>${escapeHtml(s.description)}</p></a>`,
            )
            .join("")}</div></section>`,
      )
      .join("") || '<div class="empty-state">没有匹配的网址</div>'
  }</div><aside class="nav-index">${groups.map((g, i) => `<a href="#nav-section-${i}" data-scroll="nav-section-${i}">${g.name}</a>`).join("")}<p>外部网站在新窗口打开</p></aside></div>`;
  content
    .querySelector("#reset-search")
    ?.addEventListener("click", clearSearch);
}
async function renderDetail(id) {
  const tool = tools.find((t) => t.id === id);
  if (!tool) {
    content.innerHTML =
      '<div class="empty-state">工具不存在，<a href="#/tools">返回工具列表</a></div>';
    return;
  }
  document.title = tool.name + " - 在线工具";
  content.innerHTML = `<div class="breadcrumbs"><a href="#/tools">工具</a><span>›</span><button data-category="${tool.category}">${tool.category}</button><span>›</span><span>${tool.name}</span></div><div class="detail-layout"><section class="tool-panel"><div class="panel-title"><h1>${tool.name}</h1><button class="favorite ${favorites.has(id) ? "is-saved" : ""}" data-favorite="${id}">${favorites.has(id) ? "★ 已收藏" : "☆ 加入收藏"}</button></div><p class="tool-description">${tool.description}</p><div id="tool-workspace"><div class="loading">正在准备工具…</div></div></section><aside class="related-panel"><h2>相关工具</h2>${tools
    .filter((t) => t.category === tool.category && t.id !== id)
    .slice(0, 10)
    .map(
      (t) =>
        `<a href="#/tool/${t.id}"><span>${escapeHtml(t.icon)}</span>${t.name}</a>`,
    )
    .join(
      "",
    )}<div class="privacy-note"><span>✓</span><strong>本地处理</strong><p>你的内容和文件保留在当前浏览器中。</p></div></aside></div>`;
  const root = document.getElementById("tool-workspace");
  const modules = {
    text: ["./text-tools.js", "mountText"],
    code: ["./editors.js", "mountCode"],
    regex: ["./editors.js", "mountRegex"],
    diff: ["./editors.js", "mountDiff"],
    editor: ["./editors.js", "mountEditor"],
    form: ["./form-tools.js", "mountForm"],
    reference: ["./references.js", "mountReference"],
    image: ["./image-tools.js", "mountImage"],
    draw: ["./draw-tools.js", "mountDraw"],
    file: ["./file-tools.js", "mountFile"],
    pdf: ["./pdf-tools.js", "mountPdf"],
    gif: ["./gif-tools.js", "mountGif"],
    audio: ["./audio-tools.js", "mountAudio"],
    display: ["./display-tools.js", "mountDisplay"],
    timer: ["./display-tools.js", "mountTimer"],
  };
  const [path, fn] = modules[tool.type];
  try {
    const imports = {
      "./text-tools.js": () => import("./text-tools.js"),
      "./editors.js": () => import("./editors.js"),
      "./form-tools.js": () => import("./form-tools.js"),
      "./references.js": () => import("./references.js"),
      "./image-tools.js": () => import("./image-tools.js"),
      "./draw-tools.js": () => import("./draw-tools.js"),
      "./file-tools.js": () => import("./file-tools.js"),
      "./pdf-tools.js": () => import("./pdf-tools.js"),
      "./gif-tools.js": () => import("./gif-tools.js"),
      "./audio-tools.js": () => import("./audio-tools.js"),
      "./display-tools.js": () => import("./display-tools.js"),
    };
    const module = await imports[path]();
    if (document.getElementById("tool-workspace") !== root) return;
    dispose = module[fn](root, tool);
  } catch (e) {
    root.innerHTML =
      '<div class="error-box">工具加载失败：' +
      escapeHtml(e.message) +
      "</div>";
  }
}
function route() {
  return location.hash.startsWith("#/")
    ? location.hash.slice(2).split("/")
    : ["tools"];
}
function renderCurrent() {
  dispose?.();
  dispose = null;
  const [page, id] = route();
  document
    .querySelectorAll("[data-nav]")
    .forEach((a) =>
      a.classList.toggle(
        "active",
        a.dataset.nav === (page === "nav" ? "nav" : "tools"),
      ),
    );
  document.title = "在线工具 - 你的工具箱";
  if (page === "nav") renderNav();
  else if (page === "tool") renderDetail(id);
  else renderTools();
}
window.addEventListener("hashchange", () => {
  if (!location.hash.startsWith("#/")) return;
  renderCurrent();
  window.scrollTo(0, 0);
});
content.addEventListener("click", (e) => {
  const favorite = e.target.closest("[data-favorite]");
  if (favorite) {
    const id = favorite.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    try {
      localStorage.setItem(favoritesKey, JSON.stringify([...favorites]));
    } catch {
      notify("浏览器无法保存收藏", true);
    }
    if (route()[0] === "tool") {
      favorite.textContent = favorites.has(id) ? "★ 已收藏" : "☆ 加入收藏";
      favorite.classList.toggle("is-saved", favorites.has(id));
    } else renderTools();
    return;
  }
  const cat = e.target.closest("[data-category]");
  if (cat) {
    category = cat.dataset.category;
    favoriteOnly = false;
    if (route()[0] === "tools") renderTools();
    else location.hash = "/tools";
  }
  const nav = e.target.closest("[data-nav-category]");
  if (nav) {
    navCategory = nav.dataset.navCategory;
    query = "";
    document.getElementById("search").value = "";
    renderNav();
  }
  const scroll = e.target.closest("[data-scroll]");
  if (scroll) {
    e.preventDefault();
    document
      .getElementById(scroll.dataset.scroll)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
function search() {
  query = document.getElementById("search").value.trim();
  category = "所有";
  favoriteOnly = false;
  if (route()[0] === "tool") location.hash = "/tools";
  else renderCurrent();
}
document.getElementById("search-form").onsubmit = (e) => {
  e.preventDefault();
  search();
};
let searchTimer;
document.getElementById("search").oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(search, 180);
};
document.querySelectorAll("[data-search]").forEach(
  (b) =>
    (b.onclick = () => {
      document.getElementById("search").value = b.dataset.search;
      search();
    }),
);
document.getElementById("back-top").onclick = () =>
  window.scrollTo({ top: 0, behavior: "smooth" });
renderCurrent();
