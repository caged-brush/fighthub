import { API_URL } from "../Constants";
import { safeJson } from "./safeJson";

export const apiGet = async (path, { token } = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
};
