import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { url } = (await request.json()) as { url?: string };

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Enter a valid URL." }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = windowlessTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "PaperTrail link preview bot"
      }
    });
    clearTimeout(timeout);

    const html = await response.text();
    return NextResponse.json({
      title: pickMeta(html, "og:title") || pickTitle(html) || url,
      description: pickMeta(html, "og:description") || "",
      thumbnailUrl: pickMeta(html, "og:image") || pickMeta(html, "twitter:image") || "",
      siteName: pickMeta(html, "og:site_name") || new URL(url).hostname
    });
  } catch {
    return NextResponse.json({
      title: url,
      description: "",
      thumbnailUrl: "",
      siteName: new URL(url).hostname
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

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}
