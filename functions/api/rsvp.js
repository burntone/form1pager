export async function onRequestPost(context) {
  try {
    // ── 1. Auth ─────────────────────────────────────────────────────────────
    const RESEND_API_KEY = context.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY environment variable is not set.');
      return new Response(JSON.stringify({ error: 'Server misconfiguration.' }), { status: 500 });
    }

    // ── 2. Parse body ────────────────────────────────────────────────────────
    const body = await context.request.json();
    const { fname, lname, email, company, phone, plusone,
            guest_fname, guest_lname, guest_email, guest_company } = body;

    if (!fname || !lname || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), { status: 400 });
    }

    const attendeeName = `${fname} ${lname}`;
    const companyText  = company || 'N/A';

    let plusOneText = plusone ? 'Yes' : 'No';
    if (plusone) {
      plusOneText += `\nGuest: ${guest_fname || ''} ${guest_lname || ''}`
                  + `\nGuest Email: ${guest_email || 'N/A'}`
                  + `\nGuest Company: ${guest_company || 'N/A'}`;
    }

    // ── 3. Config ────────────────────────────────────────────────────────────
    const SENDER_EMAIL = 'events@zonaro.org';
    const ADMIN_EMAIL  = 'rsvp@zonaro.org';

    // ── 4. ICS calendar attachment ───────────────────────────────────────────
    // Event: May 15th 2026, 6 PM – 9 PM CDT (= 23:00–02:00 UTC next day)
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Cigars and Networking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:cigars-networking-20260515@zonaro.org`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      'DTSTART:20260515T230000Z',
      'DTEND:20260516T020000Z',
      'SUMMARY:Cigars & Networking',
      'DESCRIPTION:A Gathering of Minds\\, A Celebration of Taste.',
      'LOCATION:980 N Deerpath Rd\\, North Aurora\\, IL 60542',
      'STATUS:CONFIRMED',
      `ORGANIZER;CN=Cigars & Networking:MAILTO:${SENDER_EMAIL}`,
      `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${attendeeName}:MAILTO:${email}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const icsBase64 = btoa(icsContent);

    // ── 5. Build Resend payloads ─────────────────────────────────────────────
    const RESEND_URL = 'https://api.resend.com/emails';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    };

    // Attendee confirmation email
    const attendeePayload = {
      from: `Cigars & Networking <${SENDER_EMAIL}>`,
      to: [email],
      subject: 'Your Invitation is Confirmed — Cigars & Networking',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#111;font-family:'Georgia',serif;color:#f5f5f5;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111;">
            <tr><td align="center" style="padding:40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                     style="max-width:600px;width:100%;background:#1a1a1a;border:1px solid #333;">
                <!-- Header -->
                <tr><td style="padding:40px 48px 24px;border-bottom:1px solid #2a2a2a;">
                  <p style="margin:0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#888;">
                    An Exclusive Invitation
                  </p>
                  <h1 style="margin:12px 0 0;font-size:28px;font-weight:400;color:#d4af37;letter-spacing:0.04em;">
                    Cigars &amp; Networking
                  </h1>
                </td></tr>
                <!-- Body -->
                <tr><td style="padding:36px 48px;">
                  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#ccc;">
                    Dear ${fname},
                  </p>
                  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#ccc;">
                    Your reservation is confirmed. We look forward to welcoming you to
                    <strong style="color:#f5f5f5;">Cigars &amp; Networking</strong> on
                    <strong style="color:#f5f5f5;">Friday, May 15, 2026</strong>.
                  </p>
                  <!-- Event details box -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                         style="background:#111;border-left:3px solid #d4af37;margin:28px 0;">
                    <tr><td style="padding:20px 24px;">
                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">
                        Event Details
                      </p>
                      <p style="margin:0 0 6px;font-size:15px;color:#f5f5f5;">
                        📅 &nbsp;Friday, May 15, 2026 &nbsp;·&nbsp; 6:00 PM
                      </p>
                      <p style="margin:0;font-size:15px;color:#f5f5f5;">
                        📍 &nbsp;980 N Deerpath Rd, North Aurora, IL 60542
                      </p>
                    </td></tr>
                  </table>
                  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#aaa;">
                    A calendar invite is attached to this email. Dress code is smart casual.
                  </p>
                  <p style="margin:32px 0 0;font-size:15px;line-height:1.7;color:#ccc;">
                    Warm regards,<br>
                    <span style="color:#d4af37;">Alex Radu</span><br>
                    <span style="color:#666;font-size:13px;">Host, Cigars &amp; Networking</span>
                  </p>
                </td></tr>
                <!-- Footer -->
                <tr><td style="padding:20px 48px;border-top:1px solid #2a2a2a;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#444;">
                    Questions? Reply to this email or contact events@zonaro.org
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
      `,
      attachments: [{
        filename: 'cigars-networking-invite.ics',
        content: icsBase64,
        content_type: 'text/calendar; method=REQUEST',
      }],
    };

    // Admin notification email
    const adminPayload = {
      from: `RSVP System <${SENDER_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: `cigars event confirmation`,
      text: [
        'New RSVP Received',
        '─────────────────',
        `Name:    ${attendeeName}`,
        `Email:   ${email}`,
        `Phone:   ${phone || 'N/A'}`,
        `Company: ${companyText}`,
        `Plus One: ${plusOneText}`,
      ].join('\n'),
    };

    // ── 6. Send both emails concurrently ─────────────────────────────────────
    const [attendeeRes, adminRes] = await Promise.all([
      fetch(RESEND_URL, { method: 'POST', headers, body: JSON.stringify(attendeePayload) }),
      fetch(RESEND_URL, { method: 'POST', headers, body: JSON.stringify(adminPayload) }),
    ]);

    // Resend returns 200 on success
    if (!attendeeRes.ok || !adminRes.ok) {
      const [attendeeErr, adminErr] = await Promise.all([
        attendeeRes.text(),
        adminRes.text(),
      ]);
      console.error('Resend attendee error:', attendeeRes.status, attendeeErr);
      console.error('Resend admin error:',    adminRes.status,    adminErr);
      return new Response(JSON.stringify({ error: 'Failed to send confirmation email.' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('RSVP handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
