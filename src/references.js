import { escapeHtml, field, copy, button, val } from "./utils.js";
const codes = [
  [100, "Continue", "继续发送请求体"],
  [101, "Switching Protocols", "切换协议"],
  [200, "OK", "请求成功"],
  [201, "Created", "资源已创建"],
  [202, "Accepted", "请求已接受"],
  [204, "No Content", "成功且无响应内容"],
  [206, "Partial Content", "范围请求成功"],
  [301, "Moved Permanently", "永久重定向"],
  [302, "Found", "临时重定向"],
  [303, "See Other", "使用 GET 请求其他地址"],
  [304, "Not Modified", "使用缓存内容"],
  [307, "Temporary Redirect", "临时重定向，保持请求方法"],
  [308, "Permanent Redirect", "永久重定向，保持请求方法"],
  [400, "Bad Request", "请求格式无效"],
  [401, "Unauthorized", "需要身份认证"],
  [403, "Forbidden", "无权限访问"],
  [404, "Not Found", "未找到资源"],
  [405, "Method Not Allowed", "请求方法不允许"],
  [408, "Request Timeout", "请求超时"],
  [409, "Conflict", "资源状态冲突"],
  [410, "Gone", "资源已删除"],
  [413, "Content Too Large", "请求体过大"],
  [414, "URI Too Long", "请求 URI 过长"],
  [415, "Unsupported Media Type", "不支持的媒体类型"],
  [418, "I'm a teapot", "彩蛋状态码"],
  [422, "Unprocessable Content", "内容无法处理"],
  [429, "Too Many Requests", "请求过于频繁"],
  [500, "Internal Server Error", "服务器内部错误"],
  [501, "Not Implemented", "服务器不支持此功能"],
  [502, "Bad Gateway", "网关上游响应无效"],
  [503, "Service Unavailable", "服务暂时不可用"],
  [504, "Gateway Timeout", "上游服务超时"],
  [505, "HTTP Version Not Supported", "HTTP 版本不受支持"],
];
const symbols = [
  ["~", "tilde", "波浪号"],
  ["!", "exclamation mark", "感叹号"],
  ["@", "at sign", "艾特符号"],
  ["#", "hash / number sign", "井号"],
  ["$", "dollar sign", "美元符号"],
  ["%", "percent sign", "百分号"],
  ["^", "caret", "插入符号"],
  ["&", "ampersand", "与符号"],
  ["*", "asterisk", "星号"],
  ["(", "left parenthesis", "左圆括号"],
  [")", "right parenthesis", "右圆括号"],
  ["_", "underscore", "下划线"],
  ["-", "hyphen / minus", "连字符 / 减号"],
  ["+", "plus sign", "加号"],
  ["=", "equals sign", "等号"],
  ["[", "left bracket", "左方括号"],
  ["]", "right bracket", "右方括号"],
  ["{", "left brace", "左花括号"],
  ["}", "right brace", "右花括号"],
  ["|", "vertical bar / pipe", "竖线"],
  ["\\", "backslash", "反斜杠"],
  ["/", "slash", "斜杠"],
  [":", "colon", "冒号"],
  [";", "semicolon", "分号"],
  ['"', "double quotation mark", "双引号"],
  ["'", "apostrophe", "单引号"],
  ["<", "less-than sign", "小于号"],
  [">", "greater-than sign", "大于号"],
  ["?", "question mark", "问号"],
  [",", "comma", "逗号"],
  [".", "period / dot", "句号"],
  ["`", "backtick", "反引号"],
];
const entities = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
  [" ", "&nbsp;"],
  ["©", "&copy;"],
  ["®", "&reg;"],
  ["™", "&trade;"],
  ["€", "&euro;"],
  ["£", "&pound;"],
  ["¥", "&yen;"],
  ["×", "&times;"],
  ["÷", "&divide;"],
  ["±", "&plusmn;"],
  ["°", "&deg;"],
  ["·", "&middot;"],
  ["…", "&hellip;"],
  ["—", "&mdash;"],
  ["←", "&larr;"],
  ["→", "&rarr;"],
  ["↑", "&uarr;"],
  ["↓", "&darr;"],
  ["♥", "&hearts;"],
  ["✓", "&#10003;"],
].map(([a, b]) => [a, b, `&#${a.codePointAt(0)};`]);
const periodicSymbols =
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(
    " ",
  );
const periodicNames = Array.from(
  "氢氦锂铍硼碳氮氧氟氖钠镁铝硅磷硫氯氩钾钙钪钛钒铬锰铁钴镍铜锌镓锗砷硒溴氪铷锶钇锆铌钼锝钌铑钯银镉铟锡锑碲碘氙铯钡镧铈镨钕钷钐铕钆铽镝钬铒铥镱镥铪钽钨铼锇铱铂金汞铊铅铋钋砹氡钫镭锕钍镤铀镎钚镅锔锫锎锿镄钔锘铹𬬻𬭊𬭳𬭛𬭶鿏𫟼𬬭鎶鉨𫓧镆𫟷鿬鿫",
);
const dynasty = [
  ["夏", "约前 2070 — 前 1600", "早期王朝，年代有争议"],
  ["商", "约前 1600 — 前 1046", "殷商"],
  ["西周", "前 1046 — 前 771", "都城镐京"],
  ["东周", "前 770 — 前 256", "春秋、战国"],
  ["秦", "前 221 — 前 207", "统一六国"],
  ["西汉", "前 202 — 公元 8", "都城长安"],
  ["新", "8 — 23", "王莽建立"],
  ["东汉", "25 — 220", "都城洛阳"],
  ["三国", "220 — 280", "魏、蜀、吴"],
  ["西晋", "266 — 316", "统一三国"],
  ["东晋", "317 — 420", "都城建康"],
  ["南北朝", "420 — 589", "南北政权并立"],
  ["隋", "581 — 618", "重新统一"],
  ["唐", "618 — 907", "都城长安"],
  ["五代十国", "907 — 979", "多个政权并立"],
  ["北宋", "960 — 1127", "都城东京"],
  ["南宋", "1127 — 1279", "都城临安"],
  ["元", "1271 — 1368", "都城大都"],
  ["明", "1368 — 1644", "南京、北京"],
  ["清", "1636 — 1912", "都城北京"],
];
const paper = {
  A: [
    [841, 1189],
    [594, 841],
    [420, 594],
    [297, 420],
    [210, 297],
    [148, 210],
    [105, 148],
    [74, 105],
    [52, 74],
    [37, 52],
    [26, 37],
  ],
  B: [
    [1000, 1414],
    [707, 1000],
    [500, 707],
    [353, 500],
    [250, 353],
    [176, 250],
    [125, 176],
    [88, 125],
    [62, 88],
    [44, 62],
    [31, 44],
  ],
  C: [
    [917, 1297],
    [648, 917],
    [458, 648],
    [324, 458],
    [229, 324],
    [162, 229],
    [114, 162],
    [81, 114],
    [57, 81],
    [40, 57],
    [28, 40],
  ],
};
const datasets = {
  httpcode: { headers: ["状态码", "名称", "含义"], rows: codes },
  symbol: { headers: ["符号", "英文", "中文"], rows: symbols },
  htmlentity: { headers: ["字符", "HTML 实体", "十进制编码"], rows: entities },
  dynasty: { headers: ["朝代", "起止时间", "说明"], rows: dynasty },
  papersize: {
    headers: ["纸张", "宽 × 高（mm）", "300 DPI 像素尺寸"],
    rows: Object.entries(paper).flatMap(([series, list]) =>
      list.map(([w, h], i) => [
        series + i,
        `${w} × ${h}`,
        `${Math.round((w / 25.4) * 300)} × ${Math.round((h / 25.4) * 300)}`,
      ]),
    ),
  },
  imagespec: {
    headers: ["规格", "毫米尺寸", "300 DPI 像素尺寸"],
    rows: [
      ["一寸", "25 × 35", "295 × 413"],
      ["小一寸", "22 × 32", "260 × 378"],
      ["大一寸", "33 × 48", "390 × 567"],
      ["二寸", "35 × 49", "413 × 579"],
      ["小二寸", "35 × 45", "413 × 531"],
      ["五寸照片", "127 × 89", "1500 × 1051"],
      ["六寸照片", "152 × 102", "1795 × 1205"],
    ],
  },
  size: {
    headers: ["类别", "尺码", "参考换算"],
    rows: [
      ["男装", "S", "165 / 84A"],
      ["男装", "M", "170 / 88A"],
      ["男装", "L", "175 / 92A"],
      ["男装", "XL", "180 / 96A"],
      ["女装", "S", "155 / 80A"],
      ["女装", "M", "160 / 84A"],
      ["女装", "L", "165 / 88A"],
      ["女装", "XL", "170 / 92A"],
      ...Array.from({ length: 12 }, (_, i) => [
        "鞋码（EU）",
        String(35 + i),
        `脚长参考 ${(225 + i * 5) / 10} cm`,
      ]),
    ],
  },
  fontfamily: {
    headers: ["字体", "类型", "CSS 声明（点击复制）"],
    rows: [
      [
        "系统无衬线",
        "通用",
        "font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;",
      ],
      [
        "中文黑体",
        "中文",
        "font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;",
      ],
      ["中文宋体", "中文", "font-family: 'Songti SC', SimSun, serif;"],
      [
        "等宽字体",
        "代码",
        "font-family: 'SFMono-Regular', Consolas, monospace;",
      ],
      ["衬线字体", "英文", "font-family: Georgia, 'Times New Roman', serif;"],
    ],
  },
  pkg: {
    headers: ["工具", "配置命令", "恢复命令"],
    rows: [
      [
        "npm",
        "npm config set registry https://registry.npmmirror.com",
        "npm config set registry https://registry.npmjs.org",
      ],
      [
        "pip",
        "pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple",
        "pip config unset global.index-url",
      ],
      [
        "pnpm",
        "pnpm config set registry https://registry.npmmirror.com",
        "pnpm config set registry https://registry.npmjs.org",
      ],
      [
        "Yarn",
        "yarn config set npmRegistryServer https://registry.npmmirror.com",
        "yarn config unset npmRegistryServer",
      ],
      [
        "Composer",
        "composer config -g repo.packagist composer https://mirrors.aliyun.com/composer/",
        "composer config -g --unset repos.packagist",
      ],
    ],
  },
};
export function mountReference(root, tool) {
  root.innerHTML = `<div class="toolbar">${field("filter", "搜索", "", "search")}</div><div id="reference-content"></div><p class="muted">${tool.id === "size" ? "尺码仅供参考，各品牌标准可能不同，请以商品尺寸表为准。" : tool.id === "imagespec" ? "具体证件要求可能不同，请以受理单位要求为准。" : ""}</p>`;
  const target = root.querySelector("#reference-content");
  function render() {
    const query = val(root, "filter").toLowerCase();
    if (tool.id === "periodic") {
      target.innerHTML =
        '<div class="elements-grid">' +
        periodicSymbols
          .map((symbol, i) => ({
            symbol,
            name: periodicNames[i],
            number: i + 1,
          }))
          .filter((x) =>
            (x.symbol + x.name + x.number).toLowerCase().includes(query),
          )
          .map(
            (x) =>
              `<button class="element" title="原子序数 ${x.number}" data-copy="${x.number} ${x.symbol} ${x.name}"><small>${x.number}</small><strong>${x.symbol}</strong><span>${x.name}</span></button>`,
          )
          .join("") +
        "</div>";
      return;
    }
    const data = datasets[tool.id];
    target.innerHTML = `<div class="table-wrap"><table><thead><tr>${data.headers.map((h) => "<th>" + escapeHtml(h) + "</th>").join("")}</tr></thead><tbody>${data.rows
      .filter((row) => row.join(" ").toLowerCase().includes(query))
      .map(
        (row) =>
          "<tr>" +
          row
            .map(
              (c) =>
                `<td><button class="copy-cell" data-copy="${escapeHtml(c)}">${escapeHtml(c)}</button></td>`,
            )
            .join("") +
          "</tr>",
      )
      .join("")}</tbody></table></div>`;
  }
  root.querySelector("#filter").oninput = render;
  target.onclick = (e) => {
    const el = e.target.closest("[data-copy]");
    if (el) copy(el.dataset.copy);
  };
  render();
}
