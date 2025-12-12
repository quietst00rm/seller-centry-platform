import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

// Recipients for all tickets
const TICKET_RECIPIENTS = [
  'info@sellercentry.com',
  'joe@sellercentry.com',
  'kristen@sellercentry.com',
];

// Lazy-load Resend client to avoid build errors when API key is not set
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

interface TicketRequest {
  subject: 'Question' | 'Document Request' | 'Status Update' | 'Other';
  message: string;
  asin?: string;
  storeName: string;
  userEmail: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: TicketRequest = await request.json();
    const { subject, message, asin, storeName, userEmail } = body;

    // Validate required fields
    if (!subject || !message || !storeName || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // Build email content
    const emailSubject = `[Seller Centry] ${subject} - ${storeName}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F97316; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Seller Centry</h1>
        </div>

        <div style="padding: 30px; background-color: #1a1a1a; color: #ffffff;">
          <h2 style="color: #F97316; margin-top: 0;">New Support Ticket</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #9ca3af;">Subject:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #333;">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #9ca3af;">Client:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #333;">${storeName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #9ca3af;">From:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #333;">${userEmail}</td>
            </tr>
            ${asin ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #9ca3af;">Related ASIN:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #333;">
                <a href="https://www.amazon.com/dp/${asin}" style="color: #F97316;">${asin}</a>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #9ca3af;">Submitted:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #333;">${timestamp}</td>
            </tr>
          </table>

          <h3 style="color: #F97316; margin-bottom: 10px;">Message:</h3>
          <div style="background-color: #222222; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>

        <div style="padding: 20px; background-color: #111111; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">This ticket was submitted via the Seller Centry Dashboard</p>
          <p style="margin: 5px 0 0 0;">${storeName}.sellercentry.com</p>
        </div>
      </div>
    `;

    const textContent = `
Seller Centry - New Support Ticket

Subject: ${subject}
Client: ${storeName}
From: ${userEmail}
${asin ? `Related ASIN: ${asin}` : ''}
Submitted: ${timestamp}

Message:
${message}

---
This ticket was submitted via the Seller Centry Dashboard
${storeName}.sellercentry.com
    `.trim();

    // Send email via Resend
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: 'Seller Centry <tickets@sellercentry.com>',
      to: TICKET_RECIPIENTS,
      replyTo: userEmail,
      subject: emailSubject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend error:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { success: false, error: `Failed to send email: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ticket API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
