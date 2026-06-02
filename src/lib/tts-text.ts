/** Remove emoji and joiners so TTS does not read them aloud. */
export function stripTextForTts(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\u200D/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
