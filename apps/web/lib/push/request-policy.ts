// Separate pure request checks so CSRF/body limits can be tested without Next.
export function trustedPushRequest(origin: string | null, contentType: string | null, canonicalUrl: string) {
  try { return origin === new URL(canonicalUrl).origin && contentType?.split(";")[0].trim() === "application/json"; }
  catch { return false; }
}
export async function readPushBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new Error("Request too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid request.");
  return data;
}
