// API route for sending support ticket email notifications
import { NextRequest, NextResponse } from "next/server";

const SUPPORT_EMAIL = "movigootech@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ticketId, userName, userEmail, category, subject, description, message } = body;

    if (type === "TICKET_CREATED") {
      // Send email to support team
      const emailSubject = `New Support Ticket: ${ticketId} - ${subject}`;
      const emailBody = `
New support ticket created:

Ticket ID: ${ticketId}
Category: ${category}
Subject: ${subject}

User Details:
Name: ${userName}
Email: ${userEmail}

Description:
${description}

---
Reply to this ticket at: https://corporate.movigoo.in (Support section)
      `.trim();

      await sendEmail(SUPPORT_EMAIL, emailSubject, emailBody);

      return NextResponse.json({ success: true, message: "Support team notified" });
    } else if (type === "SUPPORT_REPLY") {
      // Send email to user
      const emailSubject = `Support Reply: ${ticketId}`;
      const emailBody = `
You have received a reply to your support ticket ${ticketId}:

${message}

---
View full conversation at: https://corporate.movigoo.in (Support section)

Best regards,
Movigoo Support Team
      `.trim();

      await sendEmail(userEmail, emailSubject, emailBody);

      return NextResponse.json({ success: true, message: "User notified" });
    }

    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  } catch (error: any) {
    console.error("Email notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification", message: error.message },
      { status: 500 }
    );
  }
}

// Email sending function (using Firebase Cloud Function or external service)
async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // Option 1: Use existing Firebase Cloud Function for email
  const emailFunctionUrl = process.env.FIREBASE_CF_SEND_EMAIL_URL;
  
  if (emailFunctionUrl) {
    try {
      const response = await fetch(emailFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          text: body,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service returned ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to send email via Cloud Function:", error);
      // Log but don't fail - email is not critical
    }
  } else {
    // Fallback: Log email (for development)
    console.log("=== EMAIL NOTIFICATION ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log("========================");
  }
}
