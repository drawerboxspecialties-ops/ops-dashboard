# DBS Operations Hub

Internal tool directory for **Drawer Box Specialties**.

- **Hub:** https://dbs-ops-hub.vercel.app
- **GitHub Pages shortcut:** https://drawerboxspecialties-ops.github.io/ops-dashboard/
- **Repo:** https://github.com/drawerboxspecialties-ops/ops-dashboard

The github.io link redirects to Vercel. Unlock with the hub password, then Google Authenticator (or the backup code). GitHub Pages cannot keep those secrets, so login lives on Vercel.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `HUB_PASSWORD`.
3. Generate an authenticator secret with `node scripts/totp-secret.mjs` and set `HUB_TOTP_SECRET`.
4. Set `HUB_MFA_RECOVERY` to one reusable backup code (case sensitive). Change it in Vercel env anytime.
5. `npm install` and `npm run dev`.

Do not commit `.env.local`.
