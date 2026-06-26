import { useEffect, useMemo, useRef } from "react";

interface EmailHtmlBodyProps {
  html: string;
}

const EMAIL_FRAME_STYLES = `
  body {
    margin: 0;
    padding: 0;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.55;
    color: #1a1a1a;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  a { color: #0078d4; }
`;

export function EmailHtmlBody({ html }: EmailHtmlBodyProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(
    () =>
      `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>${EMAIL_FRAME_STYLES}</style></head><body>${html}</body></html>`,
    [html],
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      iframe.style.height = `${Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight) + 16}px`;
    };

    iframe.addEventListener("load", resize);
    const timer = window.setTimeout(resize, 250);
    return () => {
      iframe.removeEventListener("load", resize);
      window.clearTimeout(timer);
    };
  }, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin allow-popups"
      srcDoc={srcDoc}
      title="Email message"
      className="block w-full max-w-full min-w-0 border-0 bg-transparent"
    />
  );
}
