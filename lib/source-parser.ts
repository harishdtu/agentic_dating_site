export const validateLinkedinUrl = (u: string) =>
  /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9%_-]{3,100}\/?(\?.*)?$/.test(u.trim());
export const validateInstagramUrl = (u: string) =>
  /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?(\?.*)?$/.test(u.trim()) &&
  !/instagram\.com\/(p|reel|explore|accounts)\b/.test(u);
export const normalizeText = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const meta = (html: string, key: string) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  return (html.match(re)?.[1] ?? html.match(re2)?.[1] ?? "");
};
export function parseMetadata(html: string) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "";
  const parts = {
    title: normalizeText(title), description: normalizeText(meta(html, "description")),
    ogTitle: normalizeText(meta(html, "og:title")), ogDescription: normalizeText(meta(html, "og:description")),
  };
  return { ...parts, text: normalizeText([...new Set(Object.values(parts).filter(Boolean))].join(". ")) };
}
export const BLOCKED_MESSAGE =
  "Public profile could not be fetched automatically. The source may block automated access. Please provide publicly available profile text to analyze.";
export async function fetchPublicText(url: string, timeoutMs = 6000): Promise<{ ok: boolean; text: string; message?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": "Mozilla/5.0 (AgentDate demo)" } });
    if (!res.ok) return { ok: false, text: "", message: BLOCKED_MESSAGE };
    const { text } = parseMetadata(await res.text());
    return text.length < 20 ? { ok: false, text: "", message: BLOCKED_MESSAGE } : { ok: true, text };
  } catch {
    return { ok: false, text: "", message: BLOCKED_MESSAGE };
  }
}
