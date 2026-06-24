function looksLikeHtml(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^<(!doctype|html|head|style|meta|div|p|table|span)/i.test(trimmed) ||
    /<style[\s>]/i.test(trimmed) ||
    /<\/(p|div|table|span|td|tr|li)>/i.test(trimmed)
  );
}

export function stripHtmlEmailBody(value: string): string {
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeEmailBody(body: string, contentType?: string): string {
  const raw = body.trim();
  if (!raw) {
    return "";
  }
  if (contentType?.toLowerCase() === "html" || looksLikeHtml(raw)) {
    return stripHtmlEmailBody(raw);
  }
  return raw;
}
