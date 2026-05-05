# Cigars & Networking RSVP System

A premium, minimalist landing page and RSVP system built on Cloudflare Pages. 

This project uses standard HTML/CSS/JS for the frontend and Cloudflare Pages Functions (`functions/api/rsvp.js`) for the backend email delivery via Resend.

---

## Attendee Storage Options

Currently, the system sends an email notification to `rsvp@zonaro.org` whenever a guest RSVPs. If you want to automatically collect and view all attendees in a table format, you have two main options. Below are the steps to implement either one.

### Option 1: Cloudflare D1 (Native SQL Database)
*Best if you want to keep everything "in-house" under your Cloudflare account and build a custom `/admin` dashboard directly on your website.*

**Implementation Steps:**

1. **Create the Database in Cloudflare:**
   - Go to your Cloudflare Dashboard > **Workers & Pages** > **D1**.
   - Click **Create database** and name it `cigars-attendees`.
2. **Bind the Database to your Pages Project:**
   - Go to your Pages project (`cigars-and-networking`) > **Settings** > **Functions**.
   - Under **D1 database bindings**, add a new binding:
     - **Variable name:** `DB`
     - **D1 database:** `cigars-attendees`
3. **Create the Table:**
   - In your D1 dashboard, open the database console and run this SQL:
     ```sql
     CREATE TABLE attendees (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       fname TEXT,
       lname TEXT,
       email TEXT,
       phone TEXT,
       company TEXT,
       plus_one TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );
     ```
4. **Update the Backend (`functions/api/rsvp.js`):**
   - Add this block of code right after parsing the request body to insert the data into D1:
     ```javascript
     await context.env.DB.prepare(
       `INSERT INTO attendees (fname, lname, email, phone, company, plus_one) VALUES (?, ?, ?, ?, ?, ?)`
     ).bind(fname, lname, email, phone, companyText, plusOneText).run();
     ```
5. **Create the Admin Page:**
   - Create a new frontend file (e.g., `src/admin.html`) to display a table.
   - Create a new function (e.g., `functions/api/attendees.js`) that runs `SELECT * FROM attendees` and returns the JSON to your admin page. Note: You should add password protection to this route.

---

### Option 2: Google Sheets or Airtable (Webhook Integration)
*Best if you want an instant, powerful, shareable table without having to build and style a custom admin dashboard.*

**Implementation Steps:**

1. **Set up the Destination (Google Sheets or Airtable):**
   - **For Google Sheets:** Use a service like **Make.com** (formerly Integromat) or **Zapier** to create a simple workflow: *When a Webhook is received -> Add a row to Google Sheets*. It will generate a unique Webhook URL for you.
   - **For Airtable:** You can use Airtable's native Webhooks in their Automations tab, or their REST API.
2. **Add the Webhook URL to Cloudflare:**
   - Go to your Cloudflare Pages project > **Settings** > **Environment variables**.
   - Add a new variable:
     - **Variable name:** `WEBHOOK_URL`
     - **Value:** `https://your-zapier-or-make-webhook-url-here`
3. **Update the Backend (`functions/api/rsvp.js`):**
   - Add the following code alongside the Resend email fetch to instantly forward the data to your spreadsheet:
     ```javascript
     const WEBHOOK_URL = context.env.WEBHOOK_URL;
     if (WEBHOOK_URL) {
       await fetch(WEBHOOK_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           name: attendeeName,
           email: email,
           phone: phone || 'N/A',
           company: companyText,
           plus_one: plusOneText
         })
       }).catch(err => console.error("Webhook failed", err));
     }
     ```
4. **Deploy & Test:**
   - Push these changes to GitHub.
   - Submit a test RSVP on your live site. 
   - The data will instantly appear as a new row in your spreadsheet.