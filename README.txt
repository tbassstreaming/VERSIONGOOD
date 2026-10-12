T-BASS V3 — REAL BACKEND STARTER

WHAT THIS VERSION DOES
1. Public customer form.
2. Customer photo upload.
3. Payment screenshot upload.
4. Requests are saved in a real SQLite database.
5. Private admin login/session.
6. Dashboard shows pending requests, clients, payments and revenue.
7. Admin can verify payment, activate or reject a request.
8. Activation updates the client status and subscription dates.
9. Mobile-first dashboard.
10. Uploaded files are kept on the server in /uploads.

IMPORTANT
This is a production-ready STARTER architecture, not a fully deployed commercial service.
Before accepting real customers, you should:
- deploy behind HTTPS;
- change the admin password;
- use a strong SESSION_SECRET;
- move uploads to secure cloud/object storage;
- add rate limiting, CSRF protection, backups and audit logs;
- verify payments manually;
- have a parent/legal guardian handle any business/payment accounts if required.

RUN LOCALLY
1. Install Node.js 20+.
2. Open this folder in a terminal.
3. Run: npm install
4. Run: npm start
5. Open: http://localhost:3000

DEFAULT DEMO ADMIN
Username: admin
Password: TBASS@2026!

CHANGE THE PASSWORD
Set environment variables before starting:
TBASS_ADMIN_USER=your_username
TBASS_ADMIN_PASSWORD=your_strong_password
SESSION_SECRET=a_long_random_secret

The default demo password is only for local testing. Do not use it in production.

PAYMENT
This version does NOT automatically verify NatCash/MonCash. A payment screenshot and transaction/reference number are submitted for manual review in the private dashboard.
