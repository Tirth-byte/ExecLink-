const DEFAULT_API_BASE_URL = "https://execlink-api.onrender.com/api/v1";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
).replace(/\/$/, "");
