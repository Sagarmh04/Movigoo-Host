// API route for sending support ticket email notifications
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const OWNER_EMAIL = "movigoo4@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ticketId, userName, userEmail, category, subject, description, message } = body;

    if (type === "TICKET_CREATED") {
      // Send email to owner when ticket is created
      const emailSubject = `New Support Ticket Created: ${ticketId} - ${subject}`;
      const emailBody = `
New support ticket created:

Ticket ID: ${ticketId}
Category: ${category}
Subject: ${subject}

User Details:
Name: ${userName}
Email: ${userEmail}

Message:
${description}

---
Reply to this ticket at: https://corporate.movigoo.in/owner/organizers (Support section)
      `.trim();

      await sendEmail(OWNER_EMAIL, emailSubject, emailBody);

      return NextResponse.json({ success: true, message: "Owner notified" });
    } else if (type === "USER_REPLY") {
      // Send email to owner when user replies
      const emailSubject = `New Reply on Support Ticket: ${ticketId}`;
      const emailBody = `
User has replied to support ticket ${ticketId}:

Ticket: ${subject}
User: ${userName} (${userEmail})

User's Reply:
${message}

---
View full conversation at: https://corporate.movigoo.in/owner/organizers (Support section)
      `.trim();

      await sendEmail(OWNER_EMAIL, emailSubject, emailBody);

      return NextResponse.json({ success: true, message: "Owner notified" });
    } else if (type === "SUPPORT_REPLY") {
      // Support replies - owner already knows (they sent it), so no email needed
      // This type is kept for compatibility but won't send emails
      return NextResponse.json({ success: true, message: "No notification needed" });
    }

    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  } catch (error: any) {
    console.error("Email notification error:", error);
    // Don't fail the request - email failures should not break ticket creation
    return NextResponse.json(
      { error: "Failed to send notification", message: error.message },
      { status: 500 }
    );
  }
}

// Email sending function using Resend
async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Development fallback: Log email to console
    console.log("=== EMAIL NOTIFICATION (No RESEND_API_KEY) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log("=============================================");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    
    await resend.emails.send({
      from: "Movigoo Support <onboarding@resend.dev>",
      to,
      subject,
      text: body,
    });

    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    // Log but don't throw - email failure should not break ticket creation
  }
}
