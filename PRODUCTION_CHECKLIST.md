# T-BASS V10 production checklist

1. Choose a host/VPS with HTTPS and persistent disk.
2. Set NODE_ENV=production.
3. Set TBASS_ADMIN_USER to a non-default admin username.
4. Set TBASS_ADMIN_PASSWORD to a long unique password.
5. Set SESSION_SECRET to a long random secret.
6. Keep `tbass.sqlite` and `uploads/` on persistent storage.
7. Put the app behind HTTPS/reverse proxy.
8. Back up the database and uploads regularly.
9. Replace the placeholder WhatsApp number/settings.
10. Test customer submission from a phone and admin review from another device.
11. Verify that payment screenshots are NOT directly public.
12. For larger production, migrate SQLite to PostgreSQL and move uploads to private object storage.
13. Only sell/access streaming services through an authorized model.
