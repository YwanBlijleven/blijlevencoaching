import {
  escapeHtml,
  failureResponse,
  formatPublicError,
  json,
  parseRequestData,
  sendEmail,
  validateEmail,
  wantsJson
} from "./_lib/form-utils.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const data = await parseRequestData(request);

    if (data.company) {
      if (wantsJson(request)) {
        return json({ ok: true, message: "Thanks, you're on the list." });
      }

      return Response.redirect(new URL("/newsletter-thanks.html", request.url), 303);
    }

    const email = String(data["newsletter-email"] || "").trim();
    const to =
      process.env.NEWSLETTER_TO_EMAIL ||
      process.env.CONTACT_TO_EMAIL ||
      process.env.MAIL_TO_EMAIL;

    if (!email) {
      return failureResponse(request, "Please enter your email address.", 400);
    }

    if (!validateEmail(email)) {
      return failureResponse(request, "Please enter a valid email address.", 400);
    }

    if (!to) {
      return failureResponse(
        request,
        "Email delivery is not configured yet. Add NEWSLETTER_TO_EMAIL in Vercel.",
        503
      );
    }

    await sendEmail({
      to,
      subject: "New newsletter signup",
      replyTo: email,
      html: `
        <h1>New newsletter signup</h1>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      `
    });

    if (wantsJson(request)) {
      return json({
        ok: true,
        message: "Thanks, you're signed up."
      });
    }

    return Response.redirect(new URL("/newsletter-thanks.html", request.url), 303);
  } catch (error) {
    console.error("Newsletter form error:", error);

    return failureResponse(
      request,
      formatPublicError(
        error,
        "Something went wrong while signing up. Please try again later."
      ),
      500
    );
  }
}
