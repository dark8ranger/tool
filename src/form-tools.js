import {
  field,
  select,
  button,
  val,
  num,
  bindRun,
  copy,
  download,
  escapeHtml,
  assertRange,
} from "./utils.js";
import { convertBase, cidrInfo } from "./core.js";
import { coordinates } from "./coordinates.js";
const now = () => new Date().toISOString().slice(0, 10);
const schemas = {
  timestamp: () =>
    select("mode", "转换方向", [
      ["toDate", "时间戳 → 日期"],
      ["toStamp", "日期 → 时间戳"],
    ]) +
    field("input", "输入", Math.floor(Date.now() / 1000)) +
    select("unit", "单位", [
      ["seconds", "秒"],
      ["milliseconds", "毫秒"],
    ]),
  hexconvert: () =>
    field("input", "输入整数", "255") +
    field("from", "原进制", 10, "number", 'min="2" max="36"') +
    field("to", "目标进制", 16, "number", 'min="2" max="36"'),
  uuid: () =>
    field("count", "数量", 10, "number", 'min="1" max="1000"') +
    select("case", "大小写", ["小写", "大写"]),
  strrandom: () =>
    field("count", "数量", 10, "number", 'min="1" max="1000"') +
    field("length", "每个字符串长度", 16, "number", 'min="1" max="1024"') +
    field(
      "characters",
      "字符集",
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&",
    ),
  color: () =>
    field("input", "颜色（HEX / RGB / HSL）", "#559c78") +
    field("picker", "选择颜色", "#559c78", "color"),
  shield: () =>
    field("label", "标签", "build") +
    field("message", "内容", "passing") +
    field("color", "颜色", "#559c78", "color"),
  fraction: () =>
    field("a", "分数 A", "1/3") +
    select("op", "运算", ["+", "-", "×", "÷", "最大公约数", "最小公倍数"]) +
    field("b", "分数 B", "1/6"),
  unitconverter: () =>
    select("kind", "类别", ["长度", "面积", "重量", "温度", "数据"]) +
    field("input", "数值", 1, "number", 'step="any"') +
    select("from", "原单位", Object.keys(units["长度"])) +
    select("to", "目标单位", Object.keys(units["长度"])),
  datecalc: () =>
    select("mode", "操作", ["日期差值", "日期推算"]) +
    field("start", "开始日期", now(), "date") +
    field("end", "结束日期", now(), "date") +
    field("days", "推算天数（负数为向前）", 7, "number"),
  zodiac: () =>
    field(
      "year",
      "公历年份",
      new Date().getFullYear(),
      "number",
      'min="1" max="9999"',
    ),
  cidr: () => field("input", "IPv4 / CIDR", "192.168.1.10/24"),
  boxsize: () =>
    field("length", "单件长（cm）", 20, "number") +
    field("width", "单件宽（cm）", 15, "number") +
    field("height", "单件高（cm）", 10, "number") +
    field("x", "长方向个数", 2, "number") +
    field("y", "宽方向个数", 2, "number") +
    field("z", "高方向个数", 1, "number") +
    field("gap", "预留间隙（每侧 cm）", 1, "number"),
  partition: () => field("size", "分区容量（GiB）", 100, "number"),
  coordinate: () =>
    field("lng", "经度", 116.397128, "number", 'step="any"') +
    field("lat", "纬度", 39.916527, "number", 'step="any"') +
    select("from", "原坐标系", [
      ["wgs", "WGS-84（GPS）"],
      ["gcj", "GCJ-02（高德 / 腾讯）"],
      ["bd", "BD-09（百度）"],
    ]) +
    select("to", "目标坐标系", [
      ["gcj", "GCJ-02（高德 / 腾讯）"],
      ["wgs", "WGS-84（GPS）"],
      ["bd", "BD-09（百度）"],
    ]),
  coin: () => field("count", "抛掷次数", 1, "number", 'min="1" max="1000"'),
};
const units = {
  长度: {
    米: 1,
    千米: 1000,
    厘米: 0.01,
    毫米: 0.001,
    英寸: 0.0254,
    英尺: 0.3048,
    码: 0.9144,
    英里: 1609.344,
  },
  面积: {
    平方米: 1,
    平方千米: 1e6,
    平方厘米: 0.0001,
    公顷: 1e4,
    亩: 2000 / 3,
    平方英尺: 0.09290304,
  },
  重量: {
    千克: 1,
    克: 0.001,
    毫克: 0.000001,
    吨: 1000,
    磅: 0.45359237,
    盎司: 0.028349523125,
  },
  温度: { 摄氏度: 1, 华氏度: 1, 开尔文: 1 },
  数据: {
    B: 1,
    KB: 1000,
    MB: 1e6,
    GB: 1e9,
    KiB: 1024,
    MiB: 1048576,
    GiB: 1073741824,
  },
};
export function mountForm(root, tool) {
  root.innerHTML = `<div class="form-grid">${schemas[tool.id]()}</div><div class="toolbar">${button(tool.id === "coin" ? "抛硬币" : tool.id === "uuid" || tool.id === "strrandom" ? "生成" : "计算 / 转换")}${tool.id === "timestamp" ? button("当前时间", "now", true) : ""}${button("复制结果", "copy", true)}${button("下载结果", "download", true)}</div><pre id="result" class="result-box" aria-live="polite">结果将显示在这里</pre><div id="preview" class="output-preview" hidden></div>${tool.id === "zodiac" ? '<p class="muted">按公历年份对应的农历年生肖显示；春节前出生需参考上一年生肖。</p>' : ""}${tool.id === "coordinate" ? '<p class="muted">坐标转换为常用近似算法。GCJ-02 仅对中国境内坐标偏移。</p>' : ""}`;
  root.querySelector("#copy").onclick = () =>
    copy(root.querySelector("#result").textContent);
  root.querySelector("#download").onclick = () =>
    download(
      root.querySelector("#result").textContent,
      tool.id === "shield" ? "badge.svg" : tool.id + ".txt",
      tool.id === "shield" ? "image/svg+xml" : "text/plain",
    );
  if (tool.id === "timestamp") {
    root.querySelector("#now").onclick = () => {
      root.querySelector("#input").value =
        val(root, "mode") === "toDate"
          ? val(root, "unit") === "seconds"
            ? Math.floor(Date.now() / 1000)
            : Date.now()
          : new Date().toISOString();
      root.querySelector("#run").click();
    };
    root.querySelector("#mode").onchange = () =>
      (root.querySelector("#input").value =
        val(root, "mode") === "toDate"
          ? Math.floor(Date.now() / 1000)
          : new Date().toISOString());
  }
  if (tool.id === "unitconverter") {
    root.querySelector("#kind").onchange = () => {
      const opts = Object.keys(units[val(root, "kind")]);
      for (const id of ["from", "to"])
        root.querySelector("#" + id).innerHTML = opts
          .map((x) => `<option>${x}</option>`)
          .join("");
      root.querySelector("#to").selectedIndex = 1;
    };
    root.querySelector("#to").selectedIndex = 1;
  }
  if (tool.id === "color") {
    root.querySelector("#picker").oninput = () => {
      root.querySelector("#input").value = val(root, "picker");
      root.querySelector("#run").click();
    };
  }
  bindRun(root, async () => {
    const output = processForm(tool.id, root);
    root.querySelector("#result").textContent =
      typeof output === "string" ? output : JSON.stringify(output, null, 2);
    if (tool.id === "color") {
      root.querySelector("#preview").hidden = false;
      root.querySelector("#preview").style.background = output.HEX;
      root.querySelector("#preview").style.height = "90px";
    }
    if (tool.id === "shield") {
      root.querySelector("#preview").hidden = false;
      root.querySelector("#preview").innerHTML = output;
    }
  });
}
function positive(root, ids) {
  for (const id of ids)
    if (num(root, id) <= 0 || !Number.isFinite(num(root, id)))
      throw Error("尺寸、数量和容量必须大于零");
}
function processForm(id, r) {
  switch (id) {
    case "timestamp": {
      let date;
      if (val(r, "mode") === "toDate") {
        const n = num(r, "input");
        if (!Number.isFinite(n)) throw Error("请输入有效时间戳");
        date = new Date(n * (val(r, "unit") === "seconds" ? 1000 : 1));
      } else {
        const s = val(r, "input");
        date = new Date(s);
        if (Number.isNaN(date.getTime()))
          throw Error("请输入有效日期，例如 2026-10-12T12:00:00+08:00");
      }
      if (Number.isNaN(date.getTime())) throw Error("时间超出支持范围");
      return {
        秒: Math.floor(date.getTime() / 1000),
        毫秒: date.getTime(),
        UTC: date.toISOString(),
        北京时间: date.toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour12: false,
        }),
        本机时间: date.toLocaleString("zh-CN", { hour12: false }),
      };
    }
    case "hexconvert":
      return convertBase(val(r, "input"), num(r, "from"), num(r, "to"));
    case "uuid": {
      const count = num(r, "count");
      assertRange(count, 1, 1000, "数量");
      if (!Number.isInteger(count)) throw Error("数量必须为整数");
      return Array.from({ length: count }, () => {
        const x = crypto.randomUUID();
        return val(r, "case") === "大写" ? x.toUpperCase() : x;
      }).join("\n");
    }
    case "strrandom": {
      const count = num(r, "count"),
        length = num(r, "length"),
        chars = Array.from(new Set(Array.from(val(r, "characters"))));
      assertRange(count, 1, 1000, "数量");
      assertRange(length, 1, 1024, "长度");
      if (!Number.isInteger(count) || !Number.isInteger(length))
        throw Error("数量与长度必须是整数");
      if (!chars.length || chars.length > 65536)
        throw Error("字符集为空或过长");
      const limit = Math.floor(4294967296 / chars.length) * chars.length;
      return Array.from({ length: count }, () =>
        Array.from({ length }, () => {
          let v;
          do {
            v = crypto.getRandomValues(new Uint32Array(1))[0];
          } while (v >= limit);
          return chars[v % chars.length];
        }).join(""),
      ).join("\n");
    }
    case "cidr":
      return cidrInfo(val(r, "input"));
    case "partition":
      positive(r, ["size"]);
      return {
        GiB: num(r, "size"),
        MiB: num(r, "size") * 1024,
        十进制GB: (num(r, "size") * 1024 ** 3) / 1e9,
      };
    case "datecalc": {
      const start = new Date(val(r, "start") + "T00:00:00Z");
      if (Number.isNaN(start.getTime())) throw Error("请选择开始日期");
      if (val(r, "mode") === "日期推算") {
        assertRange(num(r, "days"), -365000, 365000, "天数");
        start.setUTCDate(start.getUTCDate() + num(r, "days"));
        return start.toISOString().slice(0, 10);
      }
      const end = new Date(val(r, "end") + "T00:00:00Z");
      if (Number.isNaN(end.getTime())) throw Error("请选择结束日期");
      const days = (end - start) / 86400000;
      return { 相差天数: days, 相差周数: days / 7, 相差小时: days * 24 };
    }
    case "zodiac": {
      const y = num(r, "year");
      assertRange(y, 1, 9999, "年份");
      if (!Number.isInteger(y)) throw Error("年份必须为整数");
      return `${y} 年：${Array.from("鼠牛虎兔龙蛇马羊猴鸡狗猪")[(((y - 4) % 12) + 12) % 12]}年`;
    }
    case "boxsize": {
      positive(r, ["length", "width", "height", "x", "y", "z"]);
      for (const id of ["x", "y", "z"])
        if (!Number.isInteger(num(r, id))) throw Error("排列数量必须是整数");
      assertRange(num(r, "gap"), 0, 1000, "间隙");
      const l = num(r, "length") * num(r, "x") + num(r, "gap") * 2,
        w = num(r, "width") * num(r, "y") + num(r, "gap") * 2,
        h = num(r, "height") * num(r, "z") + num(r, "gap") * 2;
      return {
        箱内尺寸cm: `${l} × ${w} × ${h}`,
        数量: num(r, "x") * num(r, "y") * num(r, "z"),
        体积立方米: (l * w * h) / 1e6,
      };
    }
    case "coin": {
      const count = num(r, "count");
      assertRange(count, 1, 1000, "次数");
      if (!Number.isInteger(count)) throw Error("次数必须为整数");
      const results = Array.from(
        crypto.getRandomValues(new Uint8Array(count)),
        (v) => (v & 1 ? "正面" : "反面"),
      );
      return count === 1
        ? results[0] === "正面"
          ? "🪙 正面"
          : "🪙 反面"
        : {
            正面: results.filter((x) => x === "正面").length,
            反面: results.filter((x) => x === "反面").length,
            结果: results,
          };
    }
    case "coordinate": {
      const [lng, lat] = coordinates(
        num(r, "lng"),
        num(r, "lat"),
        val(r, "from"),
        val(r, "to"),
      );
      return { 经度: lng.toFixed(8), 纬度: lat.toFixed(8) };
    }
    case "fraction": {
      const gcd = (a, b) => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
      const parse = (s) => {
        if (!/^-?\d+(?:\/-?\d+)?$/.test(s.trim()))
          throw Error("请输入整数或分数，例如 1/3");
        const [n, d = 1] = s.trim().split("/");
        if (BigInt(d) === 0n) throw Error("分母不能为 0");
        return [BigInt(n), BigInt(d)];
      };
      const [a, b] = parse(val(r, "a")),
        [c, d] = parse(val(r, "b"));
      const op = val(r, "op");
      if (op === "最大公约数" || op === "最小公倍数") {
        if (b !== 1n || d !== 1n)
          throw Error("最大公约数／最小公倍数需要输入整数");
        const g = gcd(a, c);
        return String(
          op === "最大公约数"
            ? g
            : g === 0n
              ? 0n
              : (a * c) / g < 0n
                ? (-a * c) / g
                : (a * c) / g,
        );
      }
      let n, den;
      if (op === "+") {
        n = a * d + c * b;
        den = b * d;
      } else if (op === "-") {
        n = a * d - c * b;
        den = b * d;
      } else if (op === "×") {
        n = a * c;
        den = b * d;
      } else {
        n = a * d;
        den = b * c;
      }
      if (den === 0n) throw Error("不能除以零");
      if (den < 0n) {
        n = -n;
        den = -den;
      }
      const g = gcd(n, den);
      n /= g;
      den /= g;
      return {
        最简分数: den === 1n ? String(n) : `${n}/${den}`,
        小数: Number(n) / Number(den),
      };
    }
    case "unitconverter": {
      const n = num(r, "input"),
        kind = val(r, "kind"),
        from = val(r, "from"),
        to = val(r, "to");
      if (!Number.isFinite(n)) throw Error("请输入有效数字");
      let result;
      if (kind === "温度") {
        const c =
          from === "摄氏度"
            ? n
            : from === "华氏度"
              ? ((n - 32) * 5) / 9
              : n - 273.15;
        if (c < -273.15) throw Error("温度不能低于绝对零度");
        result =
          to === "摄氏度" ? c : to === "华氏度" ? (c * 9) / 5 + 32 : c + 273.15;
      } else result = (n * units[kind][from]) / units[kind][to];
      return `${n} ${from} = ${Number(result.toPrecision(12))} ${to}`;
    }
    case "color":
      return colorInfo(val(r, "input"));
    case "shield": {
      const label = val(r, "label"),
        message = val(r, "message"),
        color = val(r, "color");
      if (label.length + message.length > 160) throw Error("徽章文字过长");
      const a = Math.max(40, Array.from(label).length * 9 + 18),
        b = Math.max(40, Array.from(message).length * 9 + 18);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${a + b}" height="24" role="img" aria-label="${escapeHtml(label + ": " + message)}"><rect width="${a + b}" height="24" rx="3" fill="${color}"/><path d="M3 0h${a - 3}v24H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3" fill="#555"/><g fill="#fff" font-family="Verdana,sans-serif" font-size="12" text-anchor="middle"><text x="${a / 2}" y="16">${escapeHtml(label)}</text><text x="${a + b / 2}" y="16">${escapeHtml(message)}</text></g></svg>`;
    }
  }
}
function colorInfo(input) {
  if (!CSS.supports("color", input)) throw Error("无法识别颜色");
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  ctx.fillStyle = input;
  ctx.fillRect(0, 0, 1, 1);
  let [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const hex =
    "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2,
    d = max - min;
  let h = 0,
    s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h =
      max === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h /= 6;
  }
  return {
    HEX: hex,
    RGB: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`,
    HSL: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
    透明度: (a / 255).toFixed(3),
  };
}
