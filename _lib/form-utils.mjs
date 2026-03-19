const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8"
};

export function wantsJson(request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("application/json");
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

export function failureResponse(request, message, status = 400) {
  if (wantsJson(request)) {
    return json({ ok: false, message }, status);
  }

  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

export function successResponse(request, message, redirectTo) {
  if (wantsJson(request)) {
    return json({ ok: true, message, redirectTo });
  }

  return Response.redirect(new URL(redirectTo, request.url), 303);
}

export function formatPublicError(error, fallbackMessage) {
  const detail = String(error?.message || "").trim();
  const isProduction = process.env.VERCEL_ENV === "production";

  if (!isProduction && detail) {
    return `${fallbackMessage} Details: ${detail}`;
  }

  return fallbackMessage;
}

export async function parseRequestData(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return normalizeObject(await request.json());
  }

  const formData = await request.formData();
  const data = {};

  for (const [key, value] of formData.entries()) {
    const nextValue = typeof value === "string" ? value.trim() : "";

    if (!(key in data)) {
      data[key] = nextValue;
      continue;
    }

    if (Array.isArray(data[key])) {
      data[key].push(nextValue);
      continue;
    }

    data[key] = [data[key], nextValue];
  }

  return data;
}

export function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

export function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmail({ to, subject, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or MAIL_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: normalizeRecipients(to),
      subject,
      html,
      reply_to: replyTo || undefined
    })
  });

  if (!response.ok) {
    let details = "";

    try {
      const payload = await response.json();
      details = payload?.message || payload?.error || JSON.stringify(payload);
    } catch {
      details = await response.text();
    }

    throw new Error(details || `Resend request failed with status ${response.status}.`);
  }

  return response.json();
}

function normalizeObject(input) {
  const data = {};

  for (const [key, value] of Object.entries(input || {})) {
    if (Array.isArray(value)) {
      data[key] = value.map((item) => String(item).trim()).filter(Boolean);
      continue;
    }

    data[key] = typeof value === "string" ? value.trim() : value;
  }

  return data;
}

function normalizeRecipients(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
