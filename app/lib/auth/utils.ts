import { getSession, getUserById } from "./storage";

const USER_DATA_COOKIE_NAME = "user_data";

export function getUserIdFromRequest(request: Request): string | null {
  const headers = request.headers;
  const userId = headers.get("X-User-Id");
  
  if (userId) {
    return userId;
  }

  const cookies = headers.get("cookie");
  if (!cookies) {
    console.log("[DEBUG] No cookies found");
    return null;
  }

  console.log("[DEBUG] Raw cookies string:", cookies);

  const userDataMatch = cookies.match(new RegExp(`${USER_DATA_COOKIE_NAME}=([^;]+)`));
  if (userDataMatch) {
    const rawValue = userDataMatch[1];
    console.log("[DEBUG] user_data raw value:", rawValue);
    let base64Value = rawValue;
    try {
      try {
        base64Value = decodeURIComponent(rawValue);
        console.log("[DEBUG] URL decoded value:", base64Value);
      } catch {
        console.log("[DEBUG] Not URL encoded, using raw value");
      }

      const userData = JSON.parse(atob(base64Value));
      console.log("[DEBUG] Parsed user data:", userData);
      return userData.id || null;
    } catch (e) {
      console.error("[DEBUG] Failed to parse user_data cookie:", e);
      console.error("[DEBUG] Base64 value that failed:", base64Value);
      return null;
    }
  }

  console.log("[DEBUG] user_data cookie not found in cookies");

  const sessionIdMatch = cookies.match(/session_id=([^;]+)/);
  if (!sessionIdMatch) {
    return null;
  }

  const session = getSession(sessionIdMatch[1]);
  return session?.user_id || null;
}

export async function getUserFromRequest(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return null;
  }
  return getUserById(userId);
}