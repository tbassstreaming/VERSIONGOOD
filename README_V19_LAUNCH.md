# T-BASS V19 — Launch Candidate

This package contains the current T-BASS public site + private admin dashboard, ready for deployment to a Node.js-capable host.

## Current requested UI
- Dark cinematic navy/blue theme with red T-BASS accents
- No client language-selection field
- Plans: 400 HTG/month, 1,000 HTG/month, 2,500 HTG/month
- NatCash: 32169865
- MonCash: 39319762 — LOUISSAINT GEDEON
- Payment number appears when the payment method is selected
- Customer photo + payment screenshot upload
- Private customer password
- Admin dashboard with manual payment verification and activation

## Important
The package is not publicly deployed by this ZIP alone. Production requires a server, domain DNS, HTTPS, persistent storage, and production secrets. Never share admin passwords or session secrets in chat.

## Health check
GET /api/health
