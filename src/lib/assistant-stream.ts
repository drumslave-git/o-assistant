import { ASSISTANT_META_MARKER } from "./assistant-format";

/** User-visible markdown only (hide metadata trailer while streaming). */
export function visibleReplyStreamText(buffer: string): string {
  const idx = buffer.indexOf(ASSISTANT_META_MARKER);
  if (idx === -1) return buffer;
  return buffer.slice(0, idx);
}
