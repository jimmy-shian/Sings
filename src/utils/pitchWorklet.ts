// ============================================================================
// SingStudio - 升降 KEY (Pitch Shift) AudioWorklet
// 演算法：雙抽頭延遲線 + 餘弦平方交叉淡出（granular delay-line pitch shifter）
//   - ratio = 2^(semitones/12)，延遲以 (1-ratio) 斜率滑動，兩抽頭相差半顆粒
//   - 交叉淡出增益 sin²(πf) + sin²(π(f+0.5)) ≡ 1（等功率且等總和，無震顫）
// 以 Blob URL 內嵌載入，Electron / Chrome / Android WebView 皆可用
// ============================================================================

const PITCH_WORKLET_CODE = `
class PitchShiftProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'semitones',
      defaultValue: 0,
      minValue: -12,
      maxValue: 12,
      automationRate: 'k-rate',
    }];
  }

  constructor() {
    super();
    // 顆粒長度 80ms：越小延遲低但顆粒感重，越大越平滑但回聲感重
    this.grain = Math.max(256, Math.round(0.08 * sampleRate));
    this.bufSize = this.grain * 2 + 256;
    this.buffers = [];
    this.writeIdx = 0;
    this.delay = 0;
    // sin² 交叉淡出查表（等功率 + 總和恆為 1）
    this.lut = new Float32Array(this.grain);
    for (let i = 0; i < this.grain; i++) {
      const s = Math.sin(Math.PI * i / this.grain);
      this.lut[i] = s * s;
    }
  }

  readLerp(buf, pos) {
    const N = buf.length;
    let p = pos % N;
    if (p < 0) p += N;
    const i0 = p | 0;
    const frac = p - i0;
    const i1 = i0 + 1 === N ? 0 : i0 + 1;
    return buf[i0] + (buf[i1] - buf[i0]) * frac;
  }

  process(inputs, outputs, params) {
    const output = outputs[0];
    const input = inputs[0];
    const semi = params.semitones.length > 0 ? params.semitones[0] : 0;
    const ratio = Math.pow(2, semi / 12);
    const frames = output[0].length;
    const grain = this.grain;
    const half = grain >> 1;
    const N = this.bufSize;

    if (!input || input.length === 0) {
      for (let c = 0; c < output.length; c++) output[c].fill(0);
      return true;
    }

    while (this.buffers.length < output.length) {
      this.buffers.push(new Float32Array(this.bufSize));
    }

    for (let c = 0; c < output.length; c++) {
      const inData = input[Math.min(c, input.length - 1)];
      const outData = output[c];
      const buf = this.buffers[c];
      if (!buf) continue;
      let w = this.writeIdx;
      let delay = this.delay;
      for (let i = 0; i < frames; i++) {
        buf[w] = inData[i];
        w = w + 1 === N ? 0 : w + 1;
        // 延遲以 (1 - ratio) 斜率滑動：ratio>1 時延遲遞減 → 讀得比寫快 → 音高上升
        delay += (1 - ratio);
        if (delay < 0) delay += grain;
        else if (delay >= grain) delay -= grain;
        const g1 = this.lut[delay | 0];
        const g2 = this.lut[(delay + half) % grain | 0];
        outData[i] =
          this.readLerp(buf, w - 1 - delay) * g1 +
          this.readLerp(buf, w - 1 - delay - half) * g2;
      }
      // 所有聲道共用同一組讀寫位置，最後一聲道處理完才回存狀態
      if (c === output.length - 1) {
        this.writeIdx = w;
        this.delay = delay;
      }
    }
    return true;
  }
}
registerProcessor('pitch-shift-processor', PitchShiftProcessor);
`;

const loadedContexts = new WeakSet<BaseAudioContext>();

/** 在指定 AudioContext 上載入處理器模組（每個 context 只載一次）並建立節點 */
export async function createPitchShifterNode(ctx: AudioContext): Promise<AudioWorkletNode> {
  if (!ctx.audioWorklet) {
    throw new Error('此環境不支援 AudioWorklet');
  }
  if (!loadedContexts.has(ctx)) {
    const url = URL.createObjectURL(new Blob([PITCH_WORKLET_CODE], { type: 'text/javascript' }));
    try {
      await ctx.audioWorklet.addModule(url);
      loadedContexts.add(ctx);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return new AudioWorkletNode(ctx, 'pitch-shift-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });
}
