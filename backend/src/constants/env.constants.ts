function splitCsv(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
export const CLIENT_URLS = splitCsv(process.env.CLIENT_URLS);
export const ALLOW_VERCEL_PREVIEW_ORIGINS =
  process.env.ALLOW_VERCEL_PREVIEW_ORIGINS !== "false";
export const NODE_ENV = process.env.NODE_ENV as "production" | "development";
export const DATABASE_URL = process.env["DATABASE_URL"];
