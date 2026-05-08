export async function onRequestPost(context) {
  try {
    // ── 1. Auth & Env ────────────────────────────────────────────────────────
    const RESEND_API_KEY = context.env.RESEND_API_KEY;
    const WEBHOOK_URL = context.env.WEBHOOK_URL;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY environment variable is not set.');
      return new Response(JSON.stringify({ error: 'Server misconfiguration (Resend).' }), { status: 500 });
    }

    // ── 2. Parse body ────────────────────────────────────────────────────────
    const body = await context.request.json();
    const { 
      fname, lname, email, company, phone, plusone,
      guest_fname, guest_lname, guest_email, guest_company, guest_phone,
      eventId 
    } = body;

    if (!fname || !lname || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), { status: 400 });
    }

    const attendeeName = `${fname} ${lname}`;
    const companyText  = company || 'N/A';

    let plusOneText = plusone ? 'Yes' : 'No';
    if (plusone) {
      plusOneText += `\nGuest: ${guest_fname || ''} ${guest_lname || ''}`
                  + `\nGuest Email: ${guest_email || 'N/A'}`
                  + `\nGuest Phone: ${guest_phone || 'N/A'}`
                  + `\nGuest Company: ${guest_company || 'N/A'}`;
    }

    // ── 3. Event Configuration ───────────────────────────────────────────────
    const events = {
      cigars: {
        id: 'cigars-networking',
        name: 'Cigars & Networking',
        dateStr: 'Friday, May 15, 2026',
        timeStr: '6:00 PM',
        locationHtml: '980 N Deerpath Rd<br><span style="color:#999;font-size:13px;line-height:1.6;">North Aurora, IL 60542</span>',
        locationICS: '980 N Deerpath Rd\\, North Aurora\\, IL 60542',
        startICS: '20260515T230000Z',
        endICS: '20260516T020000Z',
        color: '#d4af37'
      },
      ronet: {
        id: 'romanian-network',
        name: 'Romanian Network',
        dateStr: 'Saturday, June 6, 2026',
        timeStr: '4:00 PM',
        locationHtml: '980 N Deerpath Rd<br><span style="color:#999;font-size:13px;line-height:1.6;">North Aurora, IL 60542</span>',
        locationICS: '980 N Deerpath Rd\\, North Aurora\\, IL 60542',
        startICS: '20260606T210000Z',
        endICS: '20260607T000000Z',
        color: '#c28847'
      }
    };

    const evt = events[eventId] || events['cigars']; // Fallback to cigars if not provided
    const SENDER_EMAIL = 'events@zonaro.org';
    const ADMIN_EMAIL  = 'rsvp@zonaro.org';

    // ── 4. Webhook to Google Sheets (Apps Script) ────────────────────────────
    if (WEBHOOK_URL) {
      console.log('Checking registration for:', email);
      
      // 1. Primary Attendee Check & Add
      try {
        const primaryRes = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
          body: JSON.stringify({
            name: attendeeName,
            email: email,
            phone: phone || '',
            company: companyText,
            plus_one: plusone ? 'Yes (+1)' : 'No',
            event_id: evt.name
          })
        });

        const statusText = await primaryRes.text();
        if (statusText.includes('Duplicate')) {
          return new Response(JSON.stringify({ 
            error: 'You already confirmed your attendance for this event.' 
          }), { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      } catch (err) {
        console.error('Primary Webhook Error:', err);
        // Continue even if webhook fails (better to have email than nothing)
      }

      // 2. Guest Row (if applicable) — Sequential for reliability
      if (plusone) {
        const guestName = `${guest_fname || ''} ${guest_lname || ''}`.trim() || 'Guest';
        try {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            redirect: 'follow',
            body: JSON.stringify({
              name: guestName,
              email: guest_email || 'N/A',
              phone: guest_phone || 'N/A',
              company: guest_company || 'N/A',
              plus_one: `Guest of ${attendeeName}`,
              event_id: evt.name
            })
          });
        } catch (err) {
          console.error('Guest Webhook Error:', err);
        }
      }
    } else {
      console.warn('WEBHOOK_URL environment variable is NOT set. Skipping webhook.');
    }

    // ── 5. ICS calendar attachment ───────────────────────────────────────────
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Zonaro Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${evt.id}-2026@zonaro.org`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${evt.startICS}`,
      `DTEND:${evt.endICS}`,
      `SUMMARY:${evt.name}`,
      `DESCRIPTION:Join us for ${evt.name}.`,
      `LOCATION:${evt.locationICS}`,
      'STATUS:CONFIRMED',
      `ORGANIZER;CN=${evt.name}:MAILTO:${SENDER_EMAIL}`,
      `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${attendeeName}:MAILTO:${email}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const icsBase64 = btoa(icsContent);

    // ── 6. Build Resend payloads ─────────────────────────────────────────────
    const RESEND_URL = 'https://api.resend.com/emails';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    };

    // Attendee confirmation email
    const attendeePayload = {
      from: `${evt.name} <${SENDER_EMAIL}>`,
      to: [email],
      subject: `Your Invitation is Confirmed — ${evt.name}`,
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
                  <h1 style="margin:12px 0 0;font-size:28px;font-weight:400;color:${evt.color};letter-spacing:0.04em;">
                    ${evt.name}
                  </h1>
                </td></tr>
                <!-- Body -->
                <tr><td style="padding:36px 48px;">
                  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#ccc;">
                    Dear ${fname},
                  </p>
                  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#ccc;">
                    Your reservation is confirmed. We look forward to welcoming you to
                    <strong style="color:#f5f5f5;">${evt.name}</strong> on
                    <strong style="color:#f5f5f5;">${evt.dateStr}</strong>.
                  </p>
                  <!-- Event details box -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                         style="background:#141414;border-left:2px solid ${evt.color};margin:32px 0;">
                    <tr><td style="padding:28px 32px;">
                      <p style="margin:0 0 16px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#777;">
                        Event Details
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="80" style="padding-bottom:12px;vertical-align:top;">
                            <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${evt.color};">When</span>
                          </td>
                          <td style="padding-bottom:12px;">
                            <p style="margin:0;font-size:15px;color:#f5f5f5;letter-spacing:0.02em;">${evt.dateStr}<br><span style="color:#999;font-size:13px;line-height:1.6;">${evt.timeStr}</span></p>
                          </td>
                        </tr>
                        <tr>
                          <td width="80" style="vertical-align:top;">
                            <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${evt.color};">Where</span>
                          </td>
                          <td>
                            <p style="margin:0;font-size:15px;color:#f5f5f5;letter-spacing:0.02em;">${evt.locationHtml}</p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                  <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#aaa;">
                    A calendar invite is attached to this email. Dress code is smart casual.
                  </p>
                  <p style="margin:40px 0 0;font-size:15px;line-height:1.8;color:#ccc;">
                    Warm regards,<br>
                    <span style="color:${evt.color};">Zonaro Events Team</span>
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
        filename: `${evt.id}-invite.ics`,
        content: icsBase64,
        content_type: 'text/calendar; method=REQUEST',
      }],
    };

    // Admin notification email
    const adminPayload = {
      from: `RSVP System <${SENDER_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: `${evt.name} event confirmation`,
      text: [
        `New RSVP Received for ${evt.name}`,
        '─────────────────',
        `Name:    ${attendeeName}`,
        `Email:   ${email}`,
        `Phone:   ${phone || 'N/A'}`,
        `Company: ${companyText}`,
        `Plus One: ${plusOneText}`,
      ].join('\n'),
    };

    // ── 7. Send Resend emails concurrently ───────────────────────────────────
    const [attendeeRes, adminRes] = await Promise.all([
      fetch(RESEND_URL, { method: 'POST', headers, body: JSON.stringify(attendeePayload) }),
      fetch(RESEND_URL, { method: 'POST', headers, body: JSON.stringify(adminPayload) })
    ]);

    if (!attendeeRes.ok || !adminRes.ok) {
      const aData = await attendeeRes.json();
      console.error('Resend Error (Attendee):', aData);
      return new Response(JSON.stringify({ error: 'Failed to send confirmation emails.' }), { status: 502 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Unhandled Error:', err.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
