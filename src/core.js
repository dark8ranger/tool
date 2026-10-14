export function toBase64(s) {
  return btoa(
    Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(
      "",
    ),
  );
}
export function fromBase64(s) {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0)),
  );
}
export function toHex(s) {
  return Array.from(new TextEncoder().encode(s), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join(" ");
}
export function fromHex(s) {
  const cleaned = s.replace(/\s|0x/gi, "");
  if (!/^(?:[\da-f]{2})*$/i.test(cleaned))
    throw Error("请输入完整的十六进制字节");
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(cleaned.match(/../g) || [], (h) => parseInt(h, 16)),
  );
}
export function convertBase(s, from, to) {
  if (
    !Number.isInteger(from) ||
    from < 2 ||
    from > 36 ||
    !Number.isInteger(to) ||
    to < 2 ||
    to > 36
  )
    throw Error("进制必须为 2–36 的整数");
  s = s.trim().toLowerCase();
  let sign = 1n;
  if (s.startsWith("-")) {
    sign = -1n;
    s = s.slice(1);
  }
  if (!s) throw Error("请输入整数");
  let n = 0n;
  for (const c of s) {
    const d = parseInt(c, 36);
    if (!Number.isFinite(d) || d >= from)
      throw Error(`字符 ${c} 不属于 ${from} 进制`);
    n = n * BigInt(from) + BigInt(d);
  }
  return (n * sign).toString(to).toUpperCase();
}
export function wordStats(s) {
  return {
    字符数: Array.from(s).length,
    不含空白: s.replace(/\s/g, "").length,
    汉字: (s.match(/\p{Script=Han}/gu) || []).length,
    英文单词: (s.match(/[a-zA-Z]+(?:['’-][a-zA-Z]+)*/g) || []).length,
    数字: (s.match(/\d/g) || []).length,
    行数: s ? s.split(/\r?\n/).length : 0,
    段落: s.trim() ? s.trim().split(/\n\s*\n/).length : 0,
    UTF8字节: new TextEncoder().encode(s).length,
  };
}
export function moneyUpper(s) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(s.trim()))
    throw Error("请输入非负金额，最多两位小数");
  const [int, frac = ""] = s.trim().split(".");
  if (int.replace(/^0+/, "").length > 16) throw Error("金额不能超过 16 位整数");
  const chars = "零壹贰叁肆伍陆柒捌玖";
  const groupUnits = ["", "万", "亿", "兆"];
  let n = BigInt(int);
  if (n === 0n) return "零元" + fraction();
  const groups = [];
  while (n > 0n) {
    groups.push(Number(n % 10000n));
    n /= 10000n;
  }
  let out = "",
    needZero = false;
  for (let i = groups.length - 1; i >= 0; i--) {
    const x = groups[i];
    if (!x) {
      needZero = out !== "";
      continue;
    }
    if (out && (needZero || x < 1000)) out += "零";
    needZero = false;
    let g = "",
      zero = false;
    for (let p = 3; p >= 0; p--) {
      const d = Math.floor(x / 10 ** p) % 10;
      if (!d) {
        if (g) zero = true;
      } else {
        if (zero) {
          g += "零";
          zero = false;
        }
        g += chars[d] + ["", "拾", "佰", "仟"][p];
      }
    }
    out += g + groupUnits[i];
  }
  return out + "元" + fraction();
  function fraction() {
    const f = frac.padEnd(2, "0");
    return f === "00"
      ? "整"
      : (f[0] !== "0" ? chars[+f[0]] + "角" : "零") +
          (f[1] !== "0" ? chars[+f[1]] + "分" : "");
  }
}
export function cidrInfo(input) {
  const m = input.trim().match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
  if (!m) throw Error("请输入 IPv4/CIDR，例如 192.168.1.10/24");
  const octets = m.slice(1, 5).map(Number),
    p = Number(m[5]);
  if (octets.some((x) => x > 255) || p > 32)
    throw Error("IP 地址或前缀长度无效");
  const ip = octets.reduce((n, x) => (n * 256 + x) >>> 0, 0);
  const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  const network = (ip & mask) >>> 0,
    broadcast = (network | (~mask >>> 0)) >>> 0;
  const str = (n) => [24, 16, 8, 0].map((b) => (n >>> b) & 255).join(".");
  return {
    网段: str(network) + "/" + p,
    子网掩码: str(mask),
    广播地址: p >= 31 ? "无（点到点／单主机）" : str(broadcast),
    起始地址: str(network + (p < 31 ? 1 : 0)),
    结束地址: str(broadcast - (p < 31 ? 1 : 0)),
    地址总数: 2 ** (32 - p),
    可用地址数: p >= 31 ? 2 ** (32 - p) : Math.max(0, 2 ** (32 - p) - 2),
  };
}
export function parseCSV(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("CSV 引号没有闭合");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
export function subtitleConvert(text, to) {
  text = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  if (to === "vtt") {
    if (text.startsWith("WEBVTT")) return text;
    return (
      "WEBVTT\n\n" +
      text
        .replace(/^(\d+)\n(?=\d{2}:)/gm, "")
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    );
  }
  text = text
    .replace(/^WEBVTT[^\n]*\n/, "")
    .replace(
      /\b(\d{2}:\d{2}(?::\d{2})?)\.(\d{3})/g,
      (_, t, ms) => (t.length === 5 ? "00:" + t : t) + "," + ms,
    );
  let i = 0;
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((b) => b.includes("-->"))
    .map((b) => {
      const lines = b.split("\n");
      const at = lines.findIndex((l) => l.includes("-->"));
      return ++i + "\n" + lines.slice(at).join("\n");
    })
    .join("\n\n");
}
const morseCodes = [
  ".-",
  "-...",
  "-.-.",
  "-..",
  ".",
  "..-.",
  "--.",
  "....",
  "..",
  ".---",
  "-.-",
  ".-..",
  "--",
  "-.",
  "---",
  ".--.",
  "--.-",
  ".-.",
  "...",
  "-",
  "..-",
  "...-",
  ".--",
  "-..-",
  "-.--",
  "--..",
  "-----",
  ".----",
  "..---",
  "...--",
  "....-",
  ".....",
  "-....",
  "--...",
  "---..",
  "----.",
  ".-.-.-",
  "--..--",
  "..--..",
  "-.-.--",
  "-..-.",
  "-.--.",
  "-.--.-",
  "---...",
  "-....-",
  ".-..-.",
  ".-....",
  ".-.-.",
];
const morseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?!/():-"&+';
export function morse(s, decode = false) {
  const map = Object.fromEntries(
    Array.from(morseChars, (c, i) =>
      decode ? [morseCodes[i], c] : [c, morseCodes[i]],
    ),
  );
  if (decode)
    return s
      .trim()
      .split(/\s*\/\s*/)
      .map((w) =>
        w
          .split(/\s+/)
          .map((c) => {
            if (!map[c]) throw Error("无法识别摩斯码：" + c);
            return map[c];
          })
          .join(""),
      )
      .join(" ");
  return s
    .toUpperCase()
    .split(/\s+/)
    .map((w) =>
      Array.from(w, (c) => {
        if (!map[c]) throw Error("不支持字符：" + c);
        return map[c];
      }).join(" "),
    )
    .join(" / ");
}
export function bdecode(buffer) {
  const data = new Uint8Array(buffer);
  let p = 0,
    infoStart = 0,
    infoEnd = 0;
  const dec = new TextDecoder();
  function read() {
    const c = data[p];
    if (c === 105) {
      p++;
      const start = p;
      while (p < data.length && data[p] !== 101) p++;
      if (p === data.length) throw Error("种子数据不完整");
      const x = Number(dec.decode(data.slice(start, p++)));
      if (!Number.isFinite(x)) throw Error("种子整数无效");
      return x;
    }
    if (c === 108 || c === 100) {
      p++;
      const result = c === 108 ? [] : {};
      while (p < data.length && data[p] !== 101) {
        if (c === 108) result.push(read());
        else {
          const key = dec.decode(read());
          const start = p;
          result[key] = read();
          if (key === "info") {
            infoStart = start;
            infoEnd = p;
          }
        }
      }
      if (data[p++] !== 101) throw Error("种子数据不完整");
      return result;
    }
    const start = p;
    while (p < data.length && data[p] !== 58) p++;
    const count = Number(dec.decode(data.slice(start, p)));
    if (!Number.isSafeInteger(count) || count < 0 || p >= data.length)
      throw Error("无效的种子文件");
    p++;
    if (p + count > data.length) throw Error("种子数据不完整");
    const out = data.slice(p, p + count);
    p += count;
    return out;
  }
  const result = read();
  return { result, info: data.slice(infoStart, infoEnd) };
}
