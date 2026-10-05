import { api } from "./api";

const SESSION_STORAGE_KEY = "hisabkitab_auth_session";

export function getActiveSession() {
  try {
    const local = localStorage.getItem(SESSION_STORAGE_KEY);
    if (local) return JSON.parse(local);
    const session = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (session) return JSON.parse(session);
  } catch {}
  return null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function initOwnerCredentials() {
  return getActiveSession();
}

export function getOwnerProfile() {
  const session = getActiveSession();
  return session?.user || null;
}

export async function authenticateOwner(identifier, password, rememberMe = true) {
  try {
    const result = await api.login(identifier, password);
    const session = {
      token: result.token,
      authenticatedAt: new Date().toISOString(),
      user: result.user,
      shopInfo: result.shopInfo,
    };
    const target = rememberMe ? localStorage : sessionStorage;
    const other = rememberMe ? sessionStorage : localStorage;
    target.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    other.removeItem(SESSION_STORAGE_KEY);
    return { success: true, user: result.user, token: result.token, shopInfo: result.shopInfo };
  } catch (error) {
    return { success: false, message: error.message || "Unable to connect to the HisabKitab backend." };
  }
}

export async function updateOwnerPassword(currentPassword, newPassword) {
  try {
    const result = await api.updatePin(currentPassword, newPassword);
    return { success: true, message: result.message || "Security PIN updated successfully." };
  } catch (error) {
    return { success: false, message: error.message || "Failed to update security PIN." };
  }
}
