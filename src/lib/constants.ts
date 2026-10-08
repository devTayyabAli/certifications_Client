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
