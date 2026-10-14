import test from "node:test";
import assert from "node:assert/strict";
import {
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  convertBase,
  wordStats,
  moneyUpper,
  cidrInfo,
  parseCSV,
  morse,
  subtitleConvert,
  bdecode,
} from "../src/core.js";
import { coordinates } from "../src/coordinates.js";
import { parsePages } from "../src/pdf-tools.js";
import { tools } from "../src/catalog.js";
test("UTF-8 encoding round trips including Chinese and emoji", () => {
  const text = "你好 🌍\nHello";
  assert.equal(fromBase64(toBase64(text)), text);
  assert.equal(fromHex(toHex(text)), text);
  assert.throws(() => fromHex("GG"));
  assert.throws(() => fromHex("1"));
});
test("large signed integer conversions retain precision", () => {
  const original = "123456789012345678901234567890";
  assert.equal(convertBase(convertBase(original, 10, 16), 16, 10), original);
  assert.equal(convertBase("-255", 10, 16), "-FF");
  assert.throws(() => convertBase("102", 2, 10));
  assert.throws(() => convertBase("1", 1, 10));
});
test("money uppercase zeros and cross-group placement", () => {
  assert.equal(moneyUpper("0"), "零元整");
  assert.equal(moneyUpper("10001.05"), "壹万零壹元零伍分");
  assert.equal(moneyUpper("123456.78"), "壹拾贰万叁仟肆佰伍拾陆元柒角捌分");
  assert.equal(moneyUpper("100000001"), "壹亿零壹元整");
  assert.throws(() => moneyUpper("1.234"));
});
test("CIDR /0 /24 /31 /32 and invalid input", () => {
  assert.equal(cidrInfo("192.168.1.100/24").网段, "192.168.1.0/24");
  assert.equal(cidrInfo("192.168.1.100/24").结束地址, "192.168.1.254");
  assert.equal(cidrInfo("0.0.0.0/0").地址总数, 4294967296);
  assert.equal(cidrInfo("192.168.1.10/31").可用地址数, 2);
  assert.equal(cidrInfo("192.168.1.10/32").起始地址, "192.168.1.10");
  assert.throws(() => cidrInfo("256.1.1.1/24"));
});
test("CSV quoted commas, escaped quotes, and multiline values", () => {
  assert.deepEqual(parseCSV('a,b\n"x,y","a""b"\n"line\nline",z'), [
    ["a", "b"],
    ["x,y", 'a"b'],
    ["line\nline", "z"],
  ]);
  assert.throws(() => parseCSV('"unclosed'));
});
test("Morse encoding round trip and unsupported character errors", () => {
  assert.equal(morse(morse("HELLO 123?"), true), "HELLO 123?");
  assert.throws(() => morse("你好"));
});
test("subtitle conversion changes time separators and preserves dialogue", () => {
  const s = "1\n00:00:01,000 --> 00:00:03,500\n你好";
  const vtt = subtitleConvert(s, "vtt");
  assert.match(vtt, /WEBVTT/);
  assert.match(vtt, /00:00:01\.000/);
  assert.equal(subtitleConvert(vtt, "srt"), s);
});
test("PDF page selections honor order, duplicates and ranges", () => {
  assert.deepEqual(parsePages("3,1,2-3", 3), [2, 0, 1, 2]);
  assert.deepEqual(parsePages("", 3), [0, 1, 2]);
  assert.throws(() => parsePages("0", 3));
  assert.throws(() => parsePages("2-5", 3));
});
test("coordinate forward and inverse round trips", () => {
  const p = [116.397128, 39.916527];
  const gcj = coordinates(...p, "wgs", "gcj");
  const wgs = coordinates(...gcj, "gcj", "wgs");
  assert.ok(Math.abs(wgs[0] - p[0]) < 1e-6);
  assert.ok(Math.abs(wgs[1] - p[1]) < 1e-6);
  assert.deepEqual(coordinates(0, 0, "wgs", "gcj"), [0, 0]);
});
test("torrent decoder keeps exact bencoded info byte range", () => {
  const encoded = new TextEncoder().encode(
    "d4:infod6:lengthi42e4:name5:a.txtee",
  );
  const decoded = bdecode(encoded.buffer);
  assert.equal(decoded.result.info.length, 42);
  assert.equal(
    new TextDecoder().decode(decoded.info),
    "d6:lengthi42e4:name5:a.txte",
  );
  assert.throws(() => bdecode(new TextEncoder().encode("d").buffer));
});
test("tool registry has unique names and supported renderers", () => {
  assert.equal(new Set(tools.map((t) => t.id)).size, tools.length);
  const types = [
    "text",
    "code",
    "regex",
    "editor",
    "form",
    "reference",
    "image",
    "draw",
    "file",
    "pdf",
    "gif",
    "audio",
    "display",
    "timer",
    "diff",
  ];
  assert.ok(tools.every((t) => types.includes(t.type)));
  assert.ok(tools.length >= 90);
});
