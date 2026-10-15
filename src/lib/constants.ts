export const BASE_PATH = "/siherdefi";

export function assetPath(path: string): string {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === BASE_PATH || clean.startsWith(`${BASE_PATH}/`)) {
    return clean;
  }
  return `${BASE_PATH}${clean}`;
}

/** The card image shown when a link to the app is shared (Slack, WhatsApp, LinkedIn…). */
export const SHARE_IMAGE = {
  url: `${BASE_PATH}/og-image.png`,
  width: 1200,
  height: 630,
  alt: "Si Her DeFi",
};
