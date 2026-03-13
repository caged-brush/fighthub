import { API_URL } from "../Constants";

export async function apiFetch(
  path,
  { method = "GET", body, token, headers } = {},
) {
  const url = `${API_URL}${path}`;
  console.log("API_URL:", API_URL);
  console.log("REQUEST URL:", url);
  console.log("METHOD:", method);
  console.log("TOKEN?", !!token);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }

    console.log("STATUS:", res.status);
    console.log("RESPONSE:", data);

    if (!res.ok) {
      const message =
        (data && (data.message || data.error)) ||
        `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    console.log("FETCH FAILED:", err);
    throw err;
  }
}
