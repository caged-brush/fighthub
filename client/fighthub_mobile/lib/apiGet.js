import { safeJson } from "./safeJson";
export const apiGet = async (url, { token } = {}) => {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });

  const data = await safeJson(res);
  if (!res.ok)
    throw new Error(data?.message || data?.error || "Request failed");
  return data;
};
