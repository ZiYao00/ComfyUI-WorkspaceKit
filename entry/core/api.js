import { api } from "../../../scripts/api.js";

export async function fetchJson(path, options) {
  const response = await api.fetchApi(path, options);
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(response.ok
      ? `Empty response from ${path}`
      : `Request failed: ${response.status} ${response.statusText || path}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON from ${path}: ${error.message}`);
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || response.statusText);
  }
  return data;
}

export async function postJson(path, body) {
  return fetchJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
