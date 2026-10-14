import {
  select,
  button,
  val,
  bindRun,
  copy,
  download,
  escapeHtml,
  notify,
} from "./utils.js";
const examples = {
  js: 'function hello(name){const message = `你好，${name}！`;return message;}\nhello("世界");',
  css: "body{margin:0;color:#559c78;background:#fff;} .card{padding:16px;border:1px solid #ddd;}",
  html: "<!doctype html><html><head><title>示例</title></head><body><h1>你好，世界</h1></body></html>",
  sql: "select users.id, users.name, count(orders.id) as orders from users left join orders on users.id=orders.user_id group by users.id, users.name;",
  json: '{"name":"在线工具","local":true,"tools":["JSON","图片","PDF"]}',
  xml: '<?xml version="1.0"?><tools><tool id="json">JSON 工具</tool><tool id="xml">XML 工具</tool></tools>',
  yaml: "name: 在线工具\nlocal: true\ntools:\n  - JSON\n  - 图片\n  - PDF",
  markdown:
    '# 你好，世界\n\n这是你的 **本地工具箱**。\n\n- 无需登录\n- 文件不上传\n- 支持导出\n\n```js\nconsole.log("Hello world");\n```',
  asciidoc:
    "= 你好，世界\n\n欢迎使用 *在线工具*。\n\n== 功能\n\n* 本地处理\n* 无需登录",
  mermaid:
    "flowchart LR\n  A[输入内容] --> B[本地处理]\n  B --> C[预览结果]\n  C --> D[下载文件]",
};
export function mountCode(root, tool) {
  const actions =
    tool.id === "json"
      ? ["格式化", "压缩", "语法检查", "转 YAML", "转 TypeScript 接口"]
      : tool.id === "yaml"
        ? ["格式化", "转 JSON"]
        : tool.id === "sql"
          ? ["格式化", "关键词大写", "关键词小写"]
          : tool.id === "xml"
            ? ["格式化", "语法检查"]
            : ["格式化"];
  root.innerHTML = `<div class="toolbar">${select("action", "操作", actions)}${tool.id === "js" ? select("parser", "语言", ["babel", "typescript", "json"]) : ""}${tool.id === "css" ? select("parser", "语言", ["css", "scss", "less"]) : ""}${select(
    "indent",
    "缩进",
    [
      ["2", "2 空格"],
      ["4", "4 空格"],
      ["tab", "Tab"],
    ],
  )}${button("执行")}${button("示例", "sample", true)}${button("清空", "clear", true)}</div><div class="editor-pair"><label><span class="editor-title">源代码</span><textarea id="input" spellcheck="false">${escapeHtml(examples[tool.id])}</textarea></label><label><span class="editor-title">处理结果</span><textarea id="result" readonly spellcheck="false" placeholder="结果将显示在这里"></textarea></label></div><div class="toolbar bottom">${button("复制结果", "copy", true)}${button("下载代码", "download", true)}<span id="status" class="muted"></span></div>`;
  root.querySelector("#sample").onclick = () =>
    (root.querySelector("#input").value = examples[tool.id]);
  root.querySelector("#clear").onclick = () => {
    root.querySelector("#input").value = "";
    root.querySelector("#result").value = "";
  };
  root.querySelector("#copy").onclick = () => copy(val(root, "result"));
  root.querySelector("#download").onclick = () =>
    download(
      val(root, "result"),
      "formatted." + tool.id,
      "text/plain;charset=utf-8",
    );
  bindRun(root, async () => {
    const s = val(root, "input"),
      action = val(root, "action");
    if (!s.trim()) throw Error("请输入代码");
    const indent =
      val(root, "indent") === "tab" ? "\t" : Number(val(root, "indent"));
    let result;
    if (tool.id === "json") {
      const obj = JSON.parse(s);
      result =
        action === "语法检查"
          ? "✓ JSON 语法正确"
          : action === "压缩"
            ? JSON.stringify(obj)
            : action === "转 YAML"
              ? (await import("yaml")).stringify(obj)
              : action === "转 TypeScript 接口"
                ? typeScript(obj)
                : JSON.stringify(obj, null, indent);
    } else if (tool.id === "yaml") {
      const Y = await import("yaml");
      const parsed = Y.parse(s);
      result =
        action === "转 JSON"
          ? JSON.stringify(parsed, null, indent)
          : Y.stringify(parsed);
    } else if (tool.id === "xml") {
      const doc = new DOMParser().parseFromString(s, "text/xml");
      if (doc.querySelector("parsererror"))
        throw Error(doc.querySelector("parsererror").textContent);
      if (action === "语法检查") result = "✓ XML 语法正确";
      else {
        let depth = 0;
        result = s
          .replace(/>\s*</g, ">\n<")
          .split("\n")
          .map((line) => {
            if (/^<\//.test(line)) depth--;
            const out =
              (indent === "\t" ? "\t" : " ".repeat(indent)).repeat(
                Math.max(0, depth),
              ) + line;
            if (/^<[^!?/][^>]*>\s*$/.test(line) && !line.endsWith("/>"))
              depth++;
            return out;
          })
          .join("\n");
      }
    } else if (tool.id === "sql") {
      result = (await import("sql-formatter")).format(s, {
        language: "sql",
        tabWidth: typeof indent === "number" ? indent : 2,
        useTabs: indent === "\t",
        keywordCase: action === "关键词小写" ? "lower" : "upper",
      });
    } else {
      const prettier = await import("prettier/standalone");
      const parser = val(root, "parser") || tool.id;
      const plugins =
        tool.id === "js"
          ? [
              await import("prettier/plugins/babel"),
              await import("prettier/plugins/typescript"),
              await import("prettier/plugins/estree"),
            ]
          : tool.id === "css"
            ? [await import("prettier/plugins/postcss")]
            : [await import("prettier/plugins/html")];
      result = await prettier.format(s, {
        parser,
        plugins,
        tabWidth: typeof indent === "number" ? indent : 2,
        useTabs: indent === "\t",
      });
    }
    root.querySelector("#result").value = result;
    root.querySelector("#status").textContent = "处理完成";
  });
}
function typeScript(obj) {
  const type = (v) =>
    v === null
      ? "null"
      : Array.isArray(v)
        ? `Array<${[...new Set(v.map(type))].join(" | ") || "unknown"}>`
        : typeof v === "object"
          ? "{ " +
            Object.entries(v)
              .map(([k, v]) => JSON.stringify(k) + ": " + type(v))
              .join("; ") +
            " }"
          : typeof v;
  return typeof obj === "object" && !Array.isArray(obj) && obj !== null
    ? "interface Root {\n" +
        Object.entries(obj)
          .map(([k, v]) => "  " + JSON.stringify(k) + ": " + type(v) + ";")
          .join("\n") +
        "\n}"
    : "type Root = " + type(obj) + ";";
}
export function mountRegex(root) {
  root.innerHTML = `<div class="toolbar">${select("flags", "标志", ["g", "gi", "gm", "gim", "gu", "giu", "gimsu"])}${button("测试")}${button("清空", "clear", true)}</div><label class="field wide"><span>正则表达式（不包含两侧斜杠）</span><input id="pattern" value="[a-zA-Z]+"></label><div class="editor-pair"><label><span class="editor-title">测试文本</span><textarea id="input" spellcheck="false">Hello world! 你好，世界。\nEmail: hello@example.com</textarea></label><label><span class="editor-title">匹配结果</span><textarea id="result" readonly spellcheck="false"></textarea></label></div>${button("复制结果", "copy", true)}<p class="muted">表达式在独立工作线程中执行；超时后会停止，避免阻塞页面。</p>`;
  root.querySelector("#copy").onclick = () => copy(val(root, "result"));
  root.querySelector("#clear").onclick = () => {
    root.querySelector("#input").value = "";
    root.querySelector("#result").value = "";
  };
  let worker;
  bindRun(
    root,
    () =>
      new Promise((resolve, reject) => {
        worker?.terminate();
        worker = new Worker(new URL("./regex-worker.js", import.meta.url));
        const timer = setTimeout(() => {
          worker.terminate();
          reject(Error("正则测试超过 2 秒，请简化表达式"));
        }, 2000);
        worker.onmessage = (e) => {
          clearTimeout(timer);
          worker.terminate();
          if (e.data.error) reject(Error(e.data.error));
          else {
            root.querySelector("#result").value = JSON.stringify(
              e.data.matches,
              null,
              2,
            );
            resolve();
          }
        };
        worker.postMessage({
          pattern: val(root, "pattern"),
          flags: val(root, "flags"),
          text: val(root, "input"),
        });
      }),
  );
  return () => worker?.terminate();
}
export function mountDiff(root) {
  root.innerHTML = `<div class="toolbar">${button("对比文本")}${button("交换左右", "swap", true)}${button("复制差异", "copy", true)}</div><div class="editor-pair"><label><span class="editor-title">原文本</span><textarea id="input">你好，世界！\n这是原始文本。\n文件在本地处理。</textarea></label><label><span class="editor-title">新文本</span><textarea id="new">你好，世界！\n这是修改后的文本。\n文件在本地处理。\n无需注册。</textarea></label></div><div id="result" class="diff-output"></div>`;
  root.querySelector("#swap").onclick = () => {
    const a = val(root, "input");
    root.querySelector("#input").value = val(root, "new");
    root.querySelector("#new").value = a;
  };
  root.querySelector("#copy").onclick = () =>
    copy(root.querySelector("#result").textContent);
  bindRun(root, async () => {
    const { diffLines } = await import("diff");
    const parts = diffLines(val(root, "input"), val(root, "new"));
    root.querySelector("#result").innerHTML = parts
      .map(
        (p) =>
          `<pre class="${p.added ? "added" : p.removed ? "removed" : ""}">${escapeHtml((p.added ? "+ " : p.removed ? "- " : "  ") + p.value)}</pre>`,
      )
      .join("");
  });
  root.querySelector("#run").click();
}
export function mountEditor(root, tool) {
  const sample = examples[tool.id];
  root.innerHTML = `<div class="toolbar">${button("更新预览")}${button("示例", "sample", true)}${button("复制源码", "copy", true)}${button("下载源码", "source", true)}${button(tool.id === "mermaid" ? "下载 SVG" : "下载 HTML", "download", true)}</div><div class="editor-pair"><label><span class="editor-title">${tool.name}</span><textarea id="input" spellcheck="false">${escapeHtml(sample)}</textarea></label><div><span class="editor-title">实时预览</span><div id="preview" class="document-preview"></div></div></div><p id="status" class="muted"></p>`;
  let html = "",
    timer,
    sequence = 0,
    alive = true;
  root.querySelector("#sample").onclick = () => {
    root.querySelector("#input").value = sample;
    render();
  };
  root.querySelector("#copy").onclick = () => copy(val(root, "input"));
  root.querySelector("#source").onclick = () =>
    download(
      val(root, "input"),
      "document." +
        { markdown: "md", asciidoc: "adoc", mermaid: "mmd" }[tool.id],
      "text/plain",
    );
  root.querySelector("#download").onclick = () => {
    if (!html) return notify("请先生成有效预览", true);
    download(
      tool.id === "mermaid"
        ? html
        : '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>文档</title><body>' +
            html +
            "</body></html>",
      tool.id === "mermaid" ? "diagram.svg" : "document.html",
      tool.id === "mermaid" ? "image/svg+xml" : "text/html",
    );
  };
  async function render() {
    const version = ++sequence;
    const s = val(root, "input");
    try {
      let result;
      const { default: DOMPurify } = await import("dompurify");
      if (tool.id === "markdown") {
        const { marked } = await import("marked");
        result = DOMPurify.sanitize(marked.parse(s));
      } else if (tool.id === "asciidoc") {
        const { default: Asciidoctor } = await import("@asciidoctor/core");
        result = DOMPurify.sanitize(
          Asciidoctor().convert(s, { safe: "secure", standalone: false }),
        );
      } else {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "default",
        });
        result = (
          await mermaid.render("mermaid-" + Date.now() + "-" + version, s)
        ).svg;
      }
      if (!alive || version !== sequence) return;
      html = result;
      root.querySelector("#preview").innerHTML = result;
      root.querySelector("#status").textContent = "预览已更新";
    } catch (e) {
      if (!alive || version !== sequence) return;
      html = "";
      root.querySelector("#status").textContent = "语法错误：" + e.message;
    }
  }
  bindRun(root, render);
  root.querySelector("#input").oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(render, 500);
  };
  render();
  return () => {
    alive = false;
    clearTimeout(timer);
  };
}
