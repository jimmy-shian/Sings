import { env, pipeline } from '@huggingface/transformers';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import wasmModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';

const MODEL_ID = 'onnx-community/whisper-tiny';
let transcriber: any = null;
let modelLoadPromise: Promise<any> | null = null;

type WorkerRequest =
  | { type: 'download' }
  | { type: 'transcribe'; requestId: number; samples: Float32Array };

const workerScope = self as unknown as {
  addEventListener: (type: 'message', listener: (event: MessageEvent<WorkerRequest>) => void) => void;
  postMessage: (message: unknown) => void;
};

env.useBrowserCache = true;
env.allowLocalModels = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = { wasm: wasmUrl, mjs: wasmModuleUrl };
}

async function loadModel() {
  if (transcriber) return transcriber;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = pipeline('automatic-speech-recognition', MODEL_ID, {
    dtype: 'q8',
    progress_callback: (progress: Record<string, unknown>) => {
      workerScope.postMessage({ type: 'progress', progress });
    },
  } as any).then((result: any) => {
    transcriber = result;
    workerScope.postMessage({ type: 'ready' });
    return result;
  }).catch((error: unknown) => {
    modelLoadPromise = null;
    workerScope.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    throw error;
  });

  return modelLoadPromise;
}

workerScope.addEventListener('message', async ({ data }) => {
  if (data.type === 'download') {
    try {
      await loadModel();
    } catch {
      // The error has already been sent to the UI.
    }
    return;
  }

  if (data.type === 'transcribe') {
    try {
      const model = await loadModel();
      workerScope.postMessage({ type: 'transcription-started', requestId: data.requestId });
      const result = await model(data.samples, {
        task: 'transcribe',
        language: 'chinese',
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      workerScope.postMessage({ type: 'transcription-result', requestId: data.requestId, result });
    } catch (error) {
      workerScope.postMessage({
        type: 'transcription-error',
        requestId: data.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
});
