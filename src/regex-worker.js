self.onmessage = ({ data }) => {
  try {
    const regex = new RegExp(data.pattern, data.flags);
    const matches = [];
    for (const match of data.text.matchAll(regex)) {
      matches.push({
        匹配: match[0],
        位置: match.index,
        分组: match.slice(1),
        命名分组: match.groups,
      });
      if (matches.length >= 10000) break;
    }
    self.postMessage({ matches });
  } catch (e) {
    self.postMessage({ error: e.message });
  }
};
