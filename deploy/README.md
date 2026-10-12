# T-BASS V11 Deployment Package

This package is prepared for a Docker-based VPS deployment.

## Before going live
1. Copy `.env.production.example` to `.env`.
2. Set a strong `TBASS_ADMIN_PASSWORD` and `SESSION_SECRET`.
3. Replace `YOUR_DOMAIN_HERE` in `deploy/nginx.conf` with the real domain.
4. Point the domain DNS A record to the VPS IP.
5. Run `docker compose build` and `docker compose up -d`.
6. Verify `https://YOUR_DOMAIN_HERE/api/health` after TLS is configured.

## Persistent data
SQLite and uploaded payment proofs live in the `tbass_data` Docker volume. Back it up regularly with `./deploy/backup.sh`.

## HTTPS
Use a trusted TLS certificate (for example Let's Encrypt) before exposing the admin dashboard publicly. Do not use plain HTTP for production credentials or customer data.

## Important
This package is deployment-ready, but it is not itself a public deployment. Hosting credentials, domain DNS, and TLS must still be configured on a server you control.
