# T-BASS V12 — Live Deployment Setup

This package prepares T-BASS for a real VPS deployment. It does not deploy the site by itself.

## 1. VPS requirements
- Ubuntu 24.04 LTS (recommended)
- 2 GB RAM minimum
- Docker Engine + Docker Compose plugin
- A domain pointing to the VPS IP

## 2. DNS
Create these records at your domain provider:
- A record: `@` -> YOUR_VPS_IPV4
- A record: `www` -> YOUR_VPS_IPV4

Wait for DNS propagation.

## 3. Configure secrets
Copy `.env.production.example` to `.env` and set unique values for:
- TBASS_ADMIN_USER
- TBASS_ADMIN_PASSWORD
- SESSION_SECRET

Never commit `.env` to Git or send it publicly.

## 4. Start T-BASS
```bash
docker compose up -d --build
```

Check:
```bash
docker compose ps
curl http://127.0.0.1:3000/health
```

## 5. HTTPS
Use the included Nginx configuration as the reverse proxy. Obtain a certificate with Certbot after DNS is correctly pointing to the VPS, then enable HTTPS and redirect HTTP to HTTPS.

## 6. Persistent data
Keep the SQLite database and `/uploads` on persistent storage. Back up both regularly using `deploy/backup.sh`.

## 7. Final production checks
- Change all demo credentials.
- Replace placeholder WhatsApp numbers.
- Confirm HTTPS works.
- Test customer submission from a phone.
- Test admin login from a phone.
- Upload a test payment proof and verify it from the dashboard.
- Activate a test client.
- Confirm backups can be restored.

Do not advertise or sell streaming access unless the underlying distribution/access model is legally authorized.
