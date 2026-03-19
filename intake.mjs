import {
  escapeHtml,
  failureResponse,
  formatPublicError,
  parseRequestData,
  sendEmail,
  successResponse,
  toArray,
  validateEmail
} from "./_lib/form-utils.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const data = await parseRequestData(request);

    if (data["bot-field"]) {
      return successResponse(request, "Request received.", "/thanks.html");
    }

    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const phone = String(data.phone || "").trim();
    const message = String(data.message || "").trim();
    const consent = String(data["privacy-consent"] || "").trim();
    const helpItems = toArray(data.help);
    const to = process.env.CONTACT_TO_EMAIL || process.env.MAIL_TO_EMAIL;

    if (!name || !email || !consent) {
      return failureResponse(
        request,
        "Please fill in your name, email address, and privacy consent.",
        400
      );
    }

    if (!validateEmail(email)) {
      return failureResponse(request, "Please enter a valid email address.", 400);
    }

    if (!to) {
      return failureResponse(
        request,
        "Email delivery is not configured yet. Add CONTACT_TO_EMAIL in Vercel.",
        503
      );
    }

    const helpMarkup = helpItems.length
      ? `<ul>${helpItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>No topics selected.</p>";

    const notesMarkup = message
      ? `<p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>`
      : "<p>No additional message.</p>";

    await sendEmail({
      to,
      subject: `New free intake request from ${name}`,
      replyTo: email,
      html: `
        <h1>New free intake request</h1>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>
        <h2>Topics</h2>
        ${helpMarkup}
        <h2>Message</h2>
        ${notesMarkup}
      `
    });

    return successResponse(
      request,
      "Your intake request has been sent.",
      "/thanks.html"
    );
  } catch (error) {
    console.error("Intake form error:", error);

    return failureResponse(
      request,
      formatPublicError(
        error,
        "Something went wrong while sending your request. Please email blijlevencoaching@outlook.com instead."
      ),
      500
    );
  }
}
