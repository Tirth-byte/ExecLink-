import { API_BASE_URL } from "./api-config";

export async function getValidAuthToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem("execlink_token");
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp > Date.now() / 1000 + 60) {
          return token;
        }
      }
    } catch (_) {}
  }

  // Seamlessly acquire valid Lead Planner session token for web planner workspace
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "planner@execlink.demo",
        password: "Demo123!",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("execlink_token", data.token);
        return data.token;
      }
    }
  } catch (_) {}
  return token || "";
}
