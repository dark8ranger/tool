import {
  field,
  select,
  button,
  val,
  bindRun,
  copy,
  download,
  escapeHtml,
  notify,
} from "./utils.js";
import {
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  wordStats,
  moneyUpper,
  parseCSV,
  morse,
  subtitleConvert,
} from "./core.js";
const settings = {
  encdec: {
    sample: "你好，世界！Hello world.",
    actions: [
      "Base64 编码",
      "Base64 解码",
      "URL 编码",
      "URL 解码",
      "HTML 编码",
      "HTML 解码",
      "Unicode 编码",
      "Unicode 解码",
      "MD5 摘要",
      "SHA-1 摘要",
      "SHA-256 摘要",
      "AES 加密",
      "AES 解密",
    ],
  },
  hexstr: { sample: "你好 Hello", actions: ["文本 → Hex", "Hex → 文本"] },
  pinyin: {
    sample: "你好，欢迎使用在线工具。",
    actions: ["声调拼音", "数字声调", "无声调拼音", "首字母"],
  },
  zhconvert: {
    sample: "欢迎使用在线工具，文件在本地处理。",
    actions: [
      "简体 → 繁体",
      "繁体 → 简体",
      "简体 → 台湾繁体",
      "简体 → 香港繁体",
    ],
  },
  tables: {
    sample: "名称,数量,说明\n苹果,3,水果\n咖啡,1,饮品",
    actions: ["CSV → Markdown", "CSV → ASCII"],
  },
  wordcount: {
    sample: "你好，世界！\nHello world.\n\n你的本地工具箱。",
    actions: [
      "统计字数",
      "全角 → 半角",
      "半角 → 全角",
      "删除空行",
      "删除重复行",
      "去除行首尾空白",
    ],
  },
  morse: { sample: "HELLO WORLD", actions: ["编码", "解码"] },
  daxie: { sample: "123456.78", actions: ["转换"] },
  asciipainting: { sample: "HELLO TOOLBOX", actions: ["文本框", "代码注释"] },
  subtitleconverter: {
    sample:
      "1\n00:00:01,000 --> 00:00:03,500\n你好，世界。\n\n2\n00:00:04,000 --> 00:00:06,000\n欢迎使用工具箱。",
    actions: ["SRT → VTT", "VTT → SRT"],
  },
  crontab: { sample: "*/5 * * * *", actions: ["计算未来 10 次执行时间"] },
  useragent: { sample: navigator.userAgent, actions: ["分析"] },
  highlight: {
    sample: 'const greeting = "你好，世界！";\nconsole.log(greeting);',
    actions: ["生成彩色代码 HTML"],
  },
  curl: {
    sample:
      "curl 'https://example.com/api' -X POST -H 'Content-Type: application/json' -d '{\"name\":\"tool\"}'",
    actions: ["转换为 JavaScript fetch", "转换为 Python requests"],
  },
  calc: { sample: "sqrt(144) + 2^3", actions: ["计算"] },
  punycode: {
    sample: "例子.中国",
    actions: ["域名 → Punycode", "Punycode → 域名"],
  },
  urlconvert: {
    sample: "https://example.com/file.zip",
    actions: [
      "普通链接 → 迅雷",
      "普通链接 → 快车",
      "普通链接 → 旋风",
      "下载链接 → 普通链接",
    ],
  },
  eat: {
    sample: "牛肉面\n饺子\n米饭套餐\n意大利面\n沙拉\n火锅\n寿司",
    actions: ["随机选一个"],
  },
  pronounce: {
    sample: "cache\nLinux\nPython\nKubernetes\nSQL",
    actions: ["朗读"],
  },
};
export function mountText(root, tool) {
  const cfg = settings[tool.id];
  root.innerHTML = `<div class="toolbar">${select("action", "操作", cfg.actions)}${tool.id === "encdec" ? field("password", "AES 密码", "", "password") : ""}${
    tool.id === "crontab"
      ? select("timezone", "时区", [
          ["Asia/Shanghai", "北京时间 UTC+08:00"],
          ["UTC", "UTC"],
          [Intl.DateTimeFormat().resolvedOptions().timeZone, "本机时区"],
        ])
      : ""
  }${tool.id === "highlight" ? select("language", "语言", ["javascript", "typescript", "python", "java", "css", "html", "sql", "bash"]) : ""}${button("执行")}${button("填入示例", "sample", true)}${button("清空", "clear", true)}</div><div class="editor-pair"><label><span class="editor-title">输入</span><textarea id="input" spellcheck="false" placeholder="在这里输入内容…">${escapeHtml(cfg.sample)}</textarea></label><label><span class="editor-title">输出</span><textarea id="result" spellcheck="false" readonly placeholder="处理结果将显示在这里"></textarea></label></div><div class="toolbar bottom">${button("复制结果", "copy", true)}${button("下载结果", "download", true)}<span class="muted" id="status"></span></div><div id="preview" class="output-preview" hidden></div>${tool.id === "encdec" ? '<p class="muted">MD5、SHA 是单向摘要，不能解密；AES 使用密码加密，解密时需要相同密码。</p>' : ""}${tool.id === "curl" ? '<p class="muted">支持常用 URL、-X、-H、-d、--data-raw；不支持的参数会提示，不会发送请求。</p>' : ""}`;
  root.querySelector("#sample").onclick = () =>
    (root.querySelector("#input").value = cfg.sample);
  root.querySelector("#clear").onclick = () => {
    root.querySelector("#input").value = "";
    root.querySelector("#result").value = "";
    root.querySelector("#preview").hidden = true;
  };
  root.querySelector("#copy").onclick = () => copy(val(root, "result"));
  root.querySelector("#download").onclick = () =>
    download(
      val(root, "result"),
      tool.id === "subtitleconverter"
        ? val(root, "action").includes("→ VTT")
          ? "subtitle.vtt"
          : "subtitle.srt"
        : tool.id + ".txt",
      "text/plain;charset=utf-8",
    );
  bindRun(root, async () => {
    const s = val(root, "input"),
      action = val(root, "action");
    if (!s.trim()) throw Error("请输入内容");
    let result = await processText(tool.id, s, action, {
      password: val(root, "password"),
      timezone: val(root, "timezone"),
      language: val(root, "language"),
    });
    root.querySelector("#result").value =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);
    root.querySelector("#status").textContent =
      `${Array.from(root.querySelector("#result").value).length} 个字符`;
    if (tool.id === "highlight") {
      const { default: DOMPurify } = await import("dompurify");
      root.querySelector("#preview").innerHTML = DOMPurify.sanitize(result);
      root.querySelector("#preview").hidden = false;
    }
  });
  if (tool.id === "wordcount") {
    root.querySelector("#input").addEventListener("input", () => {
      if (val(root, "action") === "统计字数")
        root.querySelector("#result").value = JSON.stringify(
          wordStats(val(root, "input")),
          null,
          2,
        );
    });
    root.querySelector("#run").click();
  }
}
export async function processText(id, s, action, o = {}) {
  switch (id) {
    case "encdec": {
      if (action === "Base64 编码") return toBase64(s);
      if (action === "Base64 解码") return fromBase64(s);
      if (action === "URL 编码") return encodeURIComponent(s);
      if (action === "URL 解码") return decodeURIComponent(s);
      if (action === "HTML 编码") return escapeHtml(s);
      if (action === "HTML 解码") {
        const d = new DOMParser().parseFromString(s, "text/html");
        return d.documentElement.textContent;
      }
      if (action === "Unicode 编码")
        return s.replace(
          /[^\x00-\x7f]/g,
          (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
        );
      if (action === "Unicode 解码")
        return s.replace(/\\u([\da-f]{4})/gi, (_, h) =>
          String.fromCharCode(parseInt(h, 16)),
        );
      const { default: C } = await import("crypto-js");
      if (action.startsWith("AES")) {
        if (!o.password) throw Error("请输入 AES 密码");
        if (action === "AES 加密")
          return C.AES.encrypt(s, o.password).toString();
        const plain = C.AES.decrypt(s, o.password).toString(C.enc.Utf8);
        if (!plain) throw Error("解密失败，请检查内容与密码");
        return plain;
      }
      return C[
        { "MD5 摘要": "MD5", "SHA-1 摘要": "SHA1", "SHA-256 摘要": "SHA256" }[
          action
        ]
      ](s).toString();
    }
    case "hexstr":
      return action === "文本 → Hex" ? toHex(s) : fromHex(s);
    case "pinyin": {
      const { pinyin } = await import("pinyin-pro");
      return pinyin(s, {
        toneType:
          action === "数字声调"
            ? "num"
            : action === "无声调拼音" || action === "首字母"
              ? "none"
              : "symbol",
        pattern: action === "首字母" ? "first" : "pinyin",
      });
    }
    case "zhconvert": {
      const O = await import("opencc-js");
      const opts =
        action === "繁体 → 简体"
          ? { from: "t", to: "cn" }
          : {
              from: "cn",
              to:
                action === "简体 → 台湾繁体"
                  ? "tw"
                  : action === "简体 → 香港繁体"
                    ? "hk"
                    : "t",
            };
      return O.Converter(opts)(s);
    }
    case "tables": {
      const rows = parseCSV(s);
      if (!rows.length) throw Error("没有表格数据");
      const n = Math.max(...rows.map((r) => r.length));
      const normalized = rows.map((r) =>
        Array.from({ length: n }, (_, i) => (r[i] || "").replace(/\n/g, " ")),
      );
      if (action === "CSV → Markdown") {
        const line = (r) =>
          "| " + r.map((x) => x.replace(/\|/g, "\\|")).join(" | ") + " |";
        return [
          line(normalized[0]),
          line(Array(n).fill("---")),
          ...normalized.slice(1).map(line),
        ].join("\n");
      }
      const width = (s) =>
        Array.from(s).reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
      const widths = Array.from({ length: n }, (_, i) =>
        Math.max(...normalized.map((r) => width(r[i]))),
      );
      const border = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
      return [
        border,
        ...normalized.flatMap((r, i) => [
          "|" +
            r
              .map((x, j) => " " + x + " ".repeat(widths[j] - width(x) + 1))
              .join("|") +
            "|",
          ...(i === 0 ? [border] : []),
        ]),
        border,
      ].join("\n");
    }
    case "wordcount":
      if (action === "统计字数") return wordStats(s);
      if (action === "全角 → 半角")
        return s
          .replace(/[\uFF01-\uFF5E]/g, (c) =>
            String.fromCharCode(c.charCodeAt(0) - 65248),
          )
          .replace(/\u3000/g, " ");
      if (action === "半角 → 全角")
        return s
          .replace(/[!-~]/g, (c) =>
            String.fromCharCode(c.charCodeAt(0) + 65248),
          )
          .replace(/ /g, "　");
      if (action === "删除空行")
        return s
          .split("\n")
          .filter((x) => x.trim())
          .join("\n");
      if (action === "删除重复行")
        return [...new Set(s.split("\n"))].join("\n");
      return s
        .split("\n")
        .map((x) => x.trim())
        .join("\n");
    case "morse":
      return morse(s, action === "解码");
    case "daxie":
      return moneyUpper(s);
    case "asciipainting": {
      const lines = s.split("\n"),
        n = Math.max(
          ...lines.map((x) =>
            Array.from(x).reduce(
              (n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1),
              0,
            ),
          ),
        );
      if (n > 500) throw Error("每行最多 500 字符");
      const edge = "+" + "-".repeat(n + 2) + "+";
      const content = lines.map(
        (x) =>
          "| " +
          x +
          " ".repeat(
            n -
              Array.from(x).reduce(
                (n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1),
                0,
              ),
          ) +
          " |",
      );
      const result = [edge, ...content, edge].join("\n");
      return action === "代码注释" ? "/*\n" + result + "\n*/" : result;
    }
    case "subtitleconverter":
      return subtitleConvert(s, action === "SRT → VTT" ? "vtt" : "srt");
    case "crontab": {
      const { Cron } = await import("croner");
      const job = new Cron(s.trim(), { timezone: o.timezone });
      const runs = job.nextRuns(10);
      job.stop();
      if (!runs.length) throw Error("没有未来执行时间");
      return runs
        .map(
          (d, i) =>
            `${i + 1}. ${d.toLocaleString("zh-CN", { timeZone: o.timezone, hour12: false })}`,
        )
        .join("\n");
    }
    case "useragent":
      return {
        原始UA: s,
        系统: /Windows NT/.test(s)
          ? "Windows"
          : /Android/.test(s)
            ? "Android"
            : /iPhone|iPad/.test(s)
              ? "iOS / iPadOS"
              : /Mac OS X/.test(s)
                ? "macOS"
                : /Linux/.test(s)
                  ? "Linux"
                  : "未知",
        浏览器: /Edg\//.test(s)
          ? "Microsoft Edge"
          : /OPR\//.test(s)
            ? "Opera"
            : /Firefox\//.test(s)
              ? "Firefox"
              : /Chrome\//.test(s)
                ? "Chrome / Chromium"
                : /Safari\//.test(s)
                  ? "Safari"
                  : "未知",
        设备类型: /Mobile|Android|iPhone/.test(s) ? "移动设备" : "桌面 / 平板",
        版本: (
          s.match(/(?:Edg|OPR|Firefox|Chrome|Version)\/([\d.]+)/g) || []
        ).join(", "),
      };
    case "highlight": {
      const { default: hljs } = await import("highlight.js");
      const highlighted = hljs.highlight(s, { language: o.language }).value;
      return `<pre style="background:#f5f5f5;padding:20px;line-height:1.6"><code class="hljs language-${o.language}">${highlighted}</code></pre>`;
    }
    case "curl":
      return curlConvert(s, action.includes("Python"));
    case "calc": {
      const { evaluate } = await import("mathjs");
      if (s.length > 10000) throw Error("表达式太长");
      const result = evaluate(s);
      if (typeof result === "function") throw Error("请输入可计算的表达式");
      return String(result);
    }
    case "punycode": {
      const { default: punycode } = await import("punycode/");
      return action === "域名 → Punycode"
        ? punycode.toASCII(s.trim())
        : punycode.toUnicode(s.trim());
    }
    case "urlconvert":
      if (action === "下载链接 → 普通链接") {
        if (s.startsWith("thunder://"))
          return fromBase64(s.slice(10)).replace(/^AA|ZZ$/g, "");
        if (s.startsWith("flashget://"))
          return fromBase64(s.slice(11).split("&")[0]).replace(
            /^\[FLASHGET\]|\[FLASHGET\]$/g,
            "",
          );
        if (s.startsWith("qqdl://")) return fromBase64(s.slice(7));
        throw Error("未识别的下载链接");
      }
      if (!/^https?:\/\//.test(s.trim()))
        throw Error("请输入 HTTP 或 HTTPS 链接");
      return action === "普通链接 → 迅雷"
        ? "thunder://" + toBase64("AA" + s.trim() + "ZZ")
        : action === "普通链接 → 快车"
          ? "flashget://" +
            toBase64("[FLASHGET]" + s.trim() + "[FLASHGET]") +
            "&1926"
          : "qqdl://" + toBase64(s.trim());
    case "eat": {
      const list = s
        .split(/[\n,，]/)
        .map((x) => x.trim())
        .filter(Boolean);
      return list[crypto.getRandomValues(new Uint32Array(1))[0] % list.length];
    }
    case "pronounce":
      if (!("speechSynthesis" in window)) throw Error("浏览器不支持语音朗读");
      speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(s);
      speech.lang = "en-US";
      speech.rate = 0.85;
      speechSynthesis.speak(speech);
      return "正在朗读：\n" + s;
  }
  throw Error("未知工具");
}
function curlConvert(command, python) {
  const tokens = [];
  let current = "",
    quote = "",
    escaped = false,
    started = false;
  for (const c of command) {
    if (escaped) {
      current += c;
      escaped = false;
      started = true;
    } else if (c === "\\" && quote !== "'") {
      escaped = true;
    } else if (quote) {
      if (c === quote) quote = "";
      else current += c;
      started = true;
    } else if (c === '"' || c === "'") {
      quote = c;
      started = true;
    } else if (/\s/.test(c)) {
      if (started) {
        tokens.push(current);
        current = "";
        started = false;
      }
    } else {
      current += c;
      started = true;
    }
  }
  if (quote || escaped) throw Error("命令的引号或转义不完整");
  if (started) tokens.push(current);
  if (tokens.shift() !== "curl") throw Error("命令必须以 curl 开头");
  let url = "",
    method = "GET",
    body,
    headers = {};
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (["-X", "--request"].includes(t)) method = tokens[++i];
    else if (["-H", "--header"].includes(t)) {
      const h = tokens[++i];
      if (!h || !h.includes(":")) throw Error("请求头无效");
      const at = h.indexOf(":");
      headers[h.slice(0, at).trim()] = h.slice(at + 1).trim();
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(t)) {
      body = tokens[++i];
      if (body?.startsWith("@")) throw Error("不支持读取外部文件参数");
      if (method === "GET") method = "POST";
    } else if (["--url"].includes(t)) url = tokens[++i];
    else if (
      ["-L", "--location", "--compressed", "-s", "--silent"].includes(t)
    ) {
    } else if (t.startsWith("-")) throw Error("暂不支持参数：" + t);
    else if (!url) url = t;
    else throw Error("存在无法识别的参数：" + t);
  }
  if (!/^https?:\/\//.test(url)) throw Error("未找到 HTTP(S) URL");
  const options = { method, headers, ...(body !== undefined ? { body } : {}) };
  if (!python)
    return `const response = await fetch(${JSON.stringify(url)}, ${JSON.stringify(options, null, 2)});\nconst result = await response.text();\nconsole.log(result);`;
  return `import requests\n\nresponse = requests.request(\n    ${JSON.stringify(method)},\n    ${JSON.stringify(url)},\n    headers=${JSON.stringify(headers)},${body !== undefined ? "\n    data=" + JSON.stringify(body) + "," : ""}\n)\nprint(response.text)`;
}
