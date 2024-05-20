import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";

interface ProgressPayload {
  id: number;
  progress: number;
  total: number;
}

type ProgressHandler = (progress: number, total: number) => void;
const handlers: Map<number, ProgressHandler> = new Map();
let listening = false;

async function listenToEventIfNeeded(event: string): Promise<void> {
  if (listening) {
    return await Promise.resolve();
  }

  // We're not awaiting this Promise to prevent issues with Promise.all
  // the listener will still be registered in time.
  appWindow.listen<ProgressPayload>(event, ({ payload }) => {
    const handler = handlers.get(payload.id);
    if (handler != null) {
      handler(payload.progress, payload.total);
    }
  });

  listening = true;
}

async function upload(
  url: string,
  filePath: string,
  progressHandler?: ProgressHandler,
  headers?: Map<string, string>,
): Promise<string> {
  const ids = new Uint32Array(1);
  window.crypto.getRandomValues(ids);
  const id = ids[0];

  if (progressHandler != null) {
    handlers.set(id, progressHandler);
  }

  await listenToEventIfNeeded("upload://progress");

  return await invoke("plugin:upload|upload", {
    id,
    url,
    filePath,
    headers: headers ?? {},
  });
}

/// Download file from given url.
///
/// Note that `filePath` currently must include the file name.
/// Furthermore the progress events will report a total length of 0 if the server did not sent a `Content-Length` header or if the file is compressed.
async function download(
  url: string,
  filePath: string,
  progressHandler?: ProgressHandler,
  headers?: Map<string, string>,
): Promise<void> {
  const ids = new Uint32Array(1);
  window.crypto.getRandomValues(ids);
  const id = ids[0];

  if (progressHandler != null) {
    handlers.set(id, progressHandler);
  }

  await listenToEventIfNeeded("download://progress");

  await invoke("plugin:upload|download", {
    id,
    url,
    filePath,
    headers: headers ?? {},
  });
}

export default upload;
export { download, upload };
