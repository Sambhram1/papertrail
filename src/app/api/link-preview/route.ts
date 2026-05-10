import { NextResponse } from "next/server";
import { fetchSafeExternal } from "@/lib/security/external-url";
import { requireSupabaseUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user } = await requireSupabaseUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to preview links." }, { status: 401 });
  }

  const { url } = (await request.json()) as { url?: string };
  const rawUrl = url ?? "";

  try {
    const response = await fetchSafeExternal(rawUrl, {
      headers: {
        "user-agent": "PaperTrail link preview bot"
      }
    }, {
      timeoutMs: 6000
    });

    const contentType = response.headers.get("content-type") || "";

    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      return NextResponse.json({
        title: url,
        description: "",
        thumbnailUrl: "",
        siteName: new URL(rawUrl).hostname
      });
    }

    const html = await response.text();
    return NextResponse.json({
      title: pickMeta(html, "og:title") || pickTitle(html) || rawUrl,
      description: pickMeta(html, "og:description") || "",
      thumbnailUrl: pickMeta(html, "og:image") || pickMeta(html, "twitter:image") || "",
      siteName: pickMeta(html, "og:site_name") || new URL(rawUrl).hostname
    });
  } catch {
    return NextResponse.json({
      title: rawUrl,
      description: "",
      thumbnailUrl: "",
      siteName: new URL(rawUrl).hostname
    });
  }
}

function pickMeta(html: string, property: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1];
    if (match) {
      return decodeEntities(match);
    }
  }

  return "";
}

function pickTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  return match ? decodeEntities(match) : "";
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
