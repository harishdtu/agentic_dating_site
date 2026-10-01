import { NextResponse } from "next/server";
import { analyzeText } from "../../../lib/profile-analyzer";
import { BLOCKED_MESSAGE, fetchPublicText, normalizeText, validateInstagramUrl, validateLinkedinUrl } from "../../../lib/source-parser";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { linkedinUrl?: string; instagramUrl?: string; linkedinText?: string; instagramText?: string };
    const linkedinUrl = body.linkedinUrl?.trim() ?? "";
    const instagramUrl = body.instagramUrl?.trim() ?? "";
    if (!validateLinkedinUrl(linkedinUrl)) return NextResponse.json({ error: "Enter a valid HTTPS LinkedIn profile URL." }, { status: 400 });
    if (!validateInstagramUrl(instagramUrl)) return NextResponse.json({ error: "Enter a valid HTTPS Instagram profile URL." }, { status: 400 });
    let linkedinText = normalizeText(body.linkedinText ?? "");
    let instagramText = normalizeText(body.instagramText ?? "");
    if (!linkedinText || !instagramText) {
      const [linkedin, instagram] = await Promise.all([
        linkedinText ? Promise.resolve({ ok: true, text: linkedinText }) : fetchPublicText(linkedinUrl),
        instagramText ? Promise.resolve({ ok: true, text: instagramText }) : fetchPublicText(instagramUrl),
      ]);
      if (!linkedin.ok || !instagram.ok) return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 422 });
      linkedinText = normalizeText(linkedin.text);
      instagramText = normalizeText(instagram.text);
    }
    if (!linkedinText || !instagramText) return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 422 });
    return NextResponse.json({ analysis: analyzeText(linkedinText, instagramText), sources: { linkedin: linkedinUrl, instagram: instagramUrl } });
  } catch {
    return NextResponse.json({ error: "Invalid request. Provide both public profile URLs and source text." }, { status: 400 });
  }
}