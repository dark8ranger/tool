import {
  fileInput,
  onFile,
  field,
  select,
  button,
  val,
  num,
  bindRun,
  download,
  assertRange,
  notify,
} from "./utils.js";
export function mountAudio(root, tool) {
  let context, interval, source, stream, raf, blob, objectUrl;
  function audio() {
    context ??= new AudioContext();
    if (context.state === "suspended") context.resume();
    return context;
  }
  function tone(freq, duration = 0.08) {
    const ctx = audio(),
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
  if (tool.id === "audiocutter") {
    let buffer;
    root.innerHTML =
      fileInput("audio/*") +
      `<audio id="player" controls class="audio-player"></audio><div class="form-grid">${field("start", "起始秒", 0, "number", 'min="0" step="0.1"')}${field("end", "结束秒", 10, "number", 'min="0" step="0.1"')}</div><div class="toolbar">${button("剪辑并导出 WAV")}</div><pre id="result" class="result-box">请选择音频文件</pre>`;
    onFile(root, async (files) => {
      try {
        if (!files.length) return;
        if (files[0].size > 100 * 1024 * 1024)
          throw Error("请选择小于 100 MB 的音频");
        buffer = await audio().decodeAudioData(await files[0].arrayBuffer());
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(files[0]);
        root.querySelector("#player").src = objectUrl;
        root.querySelector("#end").value = buffer.duration.toFixed(2);
        root.querySelector("#result").textContent =
          `时长 ${buffer.duration.toFixed(2)} 秒，${buffer.numberOfChannels} 声道，${buffer.sampleRate} Hz`;
      } catch (e) {
        buffer = null;
        notify("音频读取失败：" + e.message, true);
      }
    });
    bindRun(root, () => {
      if (!buffer) throw Error("请先选择浏览器支持的音频文件");
      const start = num(root, "start"),
        end = num(root, "end");
      if (start < 0 || end <= start || end > buffer.duration + 0.01)
        throw Error("剪辑范围无效");
      blob = wav(
        buffer,
        Math.floor(start * buffer.sampleRate),
        Math.min(buffer.length, Math.floor(end * buffer.sampleRate)),
      );
      download(blob, "clip.wav");
      root.querySelector("#result").textContent =
        `已导出 ${(end - start).toFixed(2)} 秒音频`;
    });
  } else if (tool.id === "metronome") {
    root.innerHTML = `<div class="form-grid">${field("bpm", "每分钟拍数（BPM）", 80, "number", 'min="20" max="300"')}${select("beats", "每小节拍数", [4, 3, 2, 6])}</div><div class="toolbar">${button("开始", "start")}${button("停止", "stop", true)}</div><div id="beat" class="beat-display">♪</div><p class="muted">改变速度后，停止并重新开始即可生效。</p>`;
    root.querySelector("#start").onclick = () => {
      try {
        const bpm = num(root, "bpm");
        assertRange(bpm, 20, 300, "BPM");
        clearInterval(interval);
        let beat = 0;
        const play = () => {
          beat = (beat % num(root, "beats")) + 1;
          tone(beat === 1 ? 1200 : 800);
          root.querySelector("#beat").textContent = beat;
        };
        play();
        interval = setInterval(play, 60000 / bpm);
      } catch (e) {
        notify(e.message, true);
      }
    };
    root.querySelector("#stop").onclick = () => {
      clearInterval(interval);
      root.querySelector("#beat").textContent = "♪";
    };
  } else {
    const strings = [
      ["E2", 82.4069],
      ["A2", 110],
      ["D3", 146.832],
      ["G3", 195.998],
      ["B3", 246.942],
      ["E4", 329.628],
    ];
    root.innerHTML = `<p>标准调弦：E A D G B E。点击琴弦播放标准音。</p><div class="strings">${strings.map(([note, hz], i) => `<button class="string-btn" data-hz="${hz}"><small>${6 - i} 弦</small><strong>${note}</strong><span>${hz.toFixed(2)} Hz</span></button>`).join("")}</div><div class="toolbar">${button("使用麦克风测频", "start")}${button("停止麦克风", "stop", true)}</div><div id="pitch" class="pitch-display">-- Hz</div><p class="muted">麦克风测频需要浏览器授权。输入信号只在本地分析。</p>`;
    root
      .querySelectorAll("[data-hz]")
      .forEach((b) => (b.onclick = () => tone(Number(b.dataset.hz), 1.5)));
    root.querySelector("#start").onclick = async () => {
      try {
        if (stream) return;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        const ctx = audio();
        source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 8192;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        function update() {
          analyser.getFloatTimeDomainData(samples);
          const hz = pitch(samples, ctx.sampleRate);
          if (hz > 0) {
            const midi = Math.round(69 + 12 * Math.log2(hz / 440)),
              notes = [
                "C",
                "C#",
                "D",
                "D#",
                "E",
                "F",
                "F#",
                "G",
                "G#",
                "A",
                "A#",
                "B",
              ];
            const target = 440 * 2 ** ((midi - 69) / 12),
              cents = 1200 * Math.log2(hz / target);
            root.querySelector("#pitch").textContent =
              `${notes[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1} · ${hz.toFixed(1)} Hz · ${cents > 0 ? "+" : ""}${cents.toFixed(0)} 音分`;
          } else root.querySelector("#pitch").textContent = "等待稳定音符…";
          raf = requestAnimationFrame(update);
        }
        update();
      } catch (e) {
        notify("无法使用麦克风：" + e.message, true);
      }
    };
    root.querySelector("#stop").onclick = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      source?.disconnect();
      root.querySelector("#pitch").textContent = "-- Hz";
    };
  }
  return () => {
    clearInterval(interval);
    cancelAnimationFrame(raf);
    source?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    context?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
}
function wav(buffer, start, end) {
  const channels = buffer.numberOfChannels,
    length = end - start,
    bytes = length * channels * 2,
    view = new DataView(new ArrayBuffer(44 + bytes));
  const write = (p, s) =>
    Array.from(s).forEach((c, i) => view.setUint8(p + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, bytes, true);
  let p = 44;
  for (let i = start; i < end; i++)
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      p += 2;
    }
  return new Blob([view.buffer], { type: "audio/wav" });
}
function pitch(samples, rate) {
  let rms = 0;
  for (const s of samples) rms += s * s;
  if (Math.sqrt(rms / samples.length) < 0.01) return -1;
  const min = Math.floor(rate / 1000),
    max = Math.min(Math.floor(rate / 60), samples.length / 2),
    size = 2048,
    values = [];
  for (let lag = min; lag <= max; lag++) {
    let d = 0;
    for (let i = 0; i < size; i++) {
      const delta = samples[i] - samples[i + lag];
      d += delta * delta;
    }
    values[lag] = d;
  }
  let first = -1;
  const mean =
    values.slice(min, max + 1).reduce((a, b) => a + b, 0) / (max - min + 1);
  for (let lag = min + 1; lag < max; lag++)
    if (
      values[lag] < mean * 0.15 &&
      values[lag] < values[lag - 1] &&
      values[lag] < values[lag + 1]
    ) {
      first = lag;
      break;
    }
  if (first < 0) return -1;
  const left = values[first - 1],
    middle = values[first],
    right = values[first + 1],
    shift = (left - right) / (2 * (left - 2 * middle + right));
  return rate / (first + (Number.isFinite(shift) ? shift : 0));
}
