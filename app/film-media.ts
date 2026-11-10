// Private hosting can serve an entire MP3 while exposing a zero-length HTTP
// seek range. Local Blob URLs give both clocks a complete, seekable resource.
export function createFilmMediaCache(fetcher: typeof fetch = fetch) {
  const pending = new Map<string, Promise<string>>();
  const urls = new Set<string>();
  const controller = new AbortController();
  let disposed = false;
  return {
    get(file: string) {
      if (disposed)
        return Promise.reject(new DOMException("Disposed", "AbortError"));
      const cached = pending.get(file);
      if (cached) return cached;
      const request = fetcher(file, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
          const data = await response.blob();
          if (disposed) throw new DOMException("Disposed", "AbortError");
          const url = URL.createObjectURL(
            data.type.startsWith("audio/")
              ? data
              : new Blob([data], { type: "audio/mpeg" }),
          );
          urls.add(url);
          return url;
        })
        .catch((error) => {
          pending.delete(file);
          throw error;
        });
      pending.set(file, request);
      return request;
    },
    dispose() {
      disposed = true;
      controller.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      pending.clear();
    },
  };
}
export function waitForFilmMetadata(
  audio: HTMLMediaElement,
  signal: AbortSignal,
) {
  if (signal.aborted)
    return Promise.reject(new DOMException("Cancelled", "AbortError"));
  if (audio.readyState >= 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("error", failed);
      signal.removeEventListener("abort", cancelled);
    };
    const loaded = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error("Audio metadata unavailable"));
    };
    const cancelled = () => {
      cleanup();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    audio.addEventListener("loadedmetadata", loaded);
    audio.addEventListener("error", failed);
    signal.addEventListener("abort", cancelled, { once: true });
  });
}
