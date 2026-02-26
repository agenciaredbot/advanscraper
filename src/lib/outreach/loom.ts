/**
 * Loom oEmbed integration — fetch video metadata from Loom share URLs
 */

/**
 * Extract Loom video ID from a share URL, embed URL, or full embed code (<iframe>).
 * Supports:
 *   - https://www.loom.com/share/3466a170241b47a1b8474e02507b8fad
 *   - https://www.loom.com/embed/3466a170241b47a1b8474e02507b8fad
 *   - <div ...><iframe src="https://www.loom.com/embed/3466a170241b47a1b8474e02507b8fad" ...></iframe></div>
 */
export function extractLoomVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Try embed code: extract src from iframe
  const iframeSrcMatch = trimmed.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/);
  if (iframeSrcMatch) return iframeSrcMatch[1];

  // Try share URL
  const shareMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (shareMatch) return shareMatch[1];

  return null;
}

/**
 * Build a Loom share URL from a video ID
 */
export function buildLoomShareUrl(videoId: string): string {
  return `https://www.loom.com/share/${videoId}`;
}

export interface LoomVideoMeta {
  title: string;
  thumbnailUrl: string;
  embedUrl: string;
  duration: number;
  width: number;
  height: number;
}

/**
 * Fetch Loom video metadata via oEmbed
 */
export async function getLoomVideoMeta(shareUrl: string): Promise<LoomVideoMeta | null> {
  try {
    // Validate Loom URL
    if (!shareUrl.includes("loom.com/share/")) {
      return null;
    }

    const oembedUrl = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(shareUrl)}`;
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();

    // Extract video ID from share URL
    const videoId = shareUrl.split("/share/")[1]?.split("?")[0] || "";

    return {
      title: data.title || "Loom Video",
      thumbnailUrl: data.thumbnail_url || `https://cdn.loom.com/sessions/thumbnails/${videoId}-with-play.gif`,
      embedUrl: `https://www.loom.com/embed/${videoId}`,
      duration: data.duration || 0,
      width: data.width || 1920,
      height: data.height || 1080,
    };
  } catch {
    return null;
  }
}

/**
 * Generate HTML embed for Loom video in emails
 */
export function generateLoomEmailEmbed(
  shareUrl: string,
  thumbnailUrl: string,
  title: string
): string {
  return `
    <div style="margin: 16px 0;">
      <a href="${shareUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none;">
        <img
          src="${thumbnailUrl}"
          alt="${title}"
          width="360"
          style="max-width: 360px; width: 360px; border-radius: 8px; border: 1px solid #e5e7eb;"
        />
        <p style="margin-top: 6px; color: #6b7280; font-size: 13px;">
          ▶ Ver video: ${title}
        </p>
      </a>
    </div>
  `;
}
