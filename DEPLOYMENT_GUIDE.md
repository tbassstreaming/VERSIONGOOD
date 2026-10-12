# T-BASS V9 — Deployment

## Goal
Make the public form reachable from the internet and keep the private dashboard behind admin authentication.

## 1. Prepare a server
Use a Node.js hosting provider or VPS that supports:
- Node.js 20+
- HTTPS/custom domain
- Persistent disk/storage

SQLite is used in this starter, so the `tbass.sqlite` file and `uploads/` directory MUST be on persistent storage. Do not deploy it on an ephemeral filesystem.

## 2. Configure environment variables
Copy `.env.example` to `.env` and set:
- `TBASS_ADMIN_USER`
- `TBASS_ADMIN_PASSWORD`
- `SESSION_SECRET`

Never publish `.env`.

## 3. Install and run
```bash
npm install --omit=dev
node server.js
```

## 4. HTTPS
Put the app behind HTTPS. Secure cookies should then be enabled in `server.js` for the production environment.

## 5. Storage/backups
Back up:
- `tbass.sqlite`
- `uploads/`

For a larger production service, move the database to PostgreSQL and payment screenshots/customer photos to private object storage.

## 6. Replace placeholders
Before launch, replace the placeholder WhatsApp number in `public/index.html` and configure your real business contact.

## 7. Security before real customers
Add:
- rate limiting
- CSRF protection
- stricter MIME/content validation
- private/non-public upload storage
- antivirus/file scanning where appropriate
- login attempt protection
- audit review
- automated backups
- secure headers
- production cookie `secure: true`

## 8. Payment
NatCash/MonCash screenshots are evidence for MANUAL verification in this build. The system must not automatically treat a screenshot as proof of payment.

## 9. Streaming authorization
Only advertise/sell streaming access that you are legally authorized to distribute. Do not use shared or unauthorized accounts.

## 10. Minor/business requirement
Any real business, payment processor, contract, or account that requires an adult should be handled with a parent/legal guardian.
