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

### Option 2: Google Sheets (Direct Integration) or Airtable
*Best if you want an instant, powerful, shareable table without having to build and style a custom admin dashboard.*

**Implementation Steps for Google Sheets (No Zapier Needed):**

1. **Create a Google Apps Script Webhook:**
   - Create a new Google Sheet.
   - Go to **Extensions** > **Apps Script**.
   - Paste the following code into the editor:
      ```javascript
      function doPost(e) {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var data = JSON.parse(e.postData.contents);
        
        // Check for duplicates (Search Column C for Email and Column G for Event ID)
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][2] === data.email && rows[i][6] === data.event_id) {
            return ContentService.createTextOutput("Duplicate").setMimeType(ContentService.MimeType.TEXT);
          }
        }
        
        sheet.appendRow([new Date(), data.name, data.email, data.phone, data.company, data.plus_one, data.event_id]);
        return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
      }
      ```
   - Click **Deploy** > **New deployment**. Select type **Web app**.
   - Set **Execute as** to *Me*, and **Who has access** to *Anyone*. Click Deploy and copy the Web app URL.
2. **Add the Webhook URL to Cloudflare:**
   - Go to your Cloudflare Pages project > **Settings** > **Environment variables**.
   - Add a new variable:
     - **Variable name:** `WEBHOOK_URL`
     - **Value:** `https://script.google.com/macros/s/.../exec`
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