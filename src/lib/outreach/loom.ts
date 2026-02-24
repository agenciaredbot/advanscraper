/**
 * Loom oEmbed integration — fetch video metadata from Loom share URLs
 */

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
          style="max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb;"
        />
        <p style="margin-top: 8px; color: #6b7280; font-size: 14px;">
          Ver video: ${title}
        </p>
      </a>
    </div>
  `;
}
