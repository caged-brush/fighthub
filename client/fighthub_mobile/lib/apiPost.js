import { API_URL } from "../Constants";
import { safeJson } from "./safeJson";

export const apiPost = async (path, body, { token } = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
};
