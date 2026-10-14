const PI = Math.PI,
  a = 6378245,
  ee = 0.00669342162296594323;
const outside = (x, y) =>
  x < 72.004 || x > 137.8347 || y < 0.8293 || y > 55.8271;
function lat(x, y) {
  let r =
    -100 +
    2 * x +
    3 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  r += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
  return (
    r +
    ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3
  );
}
function lng(x, y) {
  let r =
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  r += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
  return (
    r +
    ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3
  );
}
function wgsToGcj(x, y) {
  if (outside(x, y)) return [x, y];
  let dy = lat(x - 105, y - 35),
    dx = lng(x - 105, y - 35);
  const rad = (y / 180) * PI,
    sin = Math.sin(rad),
    magic = 1 - ee * sin * sin,
    sqrt = Math.sqrt(magic);
  dy = (dy * 180) / (((a * (1 - ee)) / (magic * sqrt)) * PI);
  dx = (dx * 180) / ((a / sqrt) * Math.cos(rad) * PI);
  return [x + dx, y + dy];
}
function gcjToWgs(x, y) {
  let px = x,
    py = y;
  for (let i = 0; i < 8; i++) {
    const [cx, cy] = wgsToGcj(px, py);
    px -= cx - x;
    py -= cy - y;
  }
  return [px, py];
}
function gcjToBd(x, y) {
  const z =
    Math.sqrt(x * x + y * y) + 0.00002 * Math.sin((y * PI * 3000) / 180);
  const t = Math.atan2(y, x) + 0.000003 * Math.cos((x * PI * 3000) / 180);
  return [z * Math.cos(t) + 0.0065, z * Math.sin(t) + 0.006];
}
function bdToGcj(x, y) {
  x -= 0.0065;
  y -= 0.006;
  const z =
      Math.sqrt(x * x + y * y) - 0.00002 * Math.sin((y * PI * 3000) / 180),
    t = Math.atan2(y, x) - 0.000003 * Math.cos((x * PI * 3000) / 180);
  return [z * Math.cos(t), z * Math.sin(t)];
}
export function coordinates(x, y, from, to) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    Math.abs(x) > 180 ||
    Math.abs(y) > 90
  )
    throw Error("经纬度无效");
  if (from === to) return [x, y];
  let gcj =
    from === "wgs" ? wgsToGcj(x, y) : from === "bd" ? bdToGcj(x, y) : [x, y];
  return to === "gcj" ? gcj : to === "bd" ? gcjToBd(...gcj) : gcjToWgs(...gcj);
}
