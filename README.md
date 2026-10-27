# DBS Operations Hub

Internal tool directory for **Drawer Box Specialties**.

- **Hub:** https://dbs-ops-hub.vercel.app
- **Allmoxy Bottoms:** https://allmoxy-bottoms.vercel.app
- **Slab Measure:** https://dbs-ops-hub.vercel.app/slab
- **GitHub Pages shortcut:** https://drawerboxspecialties-ops.github.io/ops-dashboard/
- **Repo:** https://github.com/drawerboxspecialties-ops/ops-dashboard

The github.io link redirects to Vercel. Unlock with the hub password, then Google Authenticator (or the backup code). GitHub Pages cannot keep those secrets, so login lives on Vercel.

Allmoxy Bottoms is its own repo, [allmoxy-bottoms](https://github.com/drawerboxspecialties-ops/allmoxy-bottoms). The hub card opens that app. `/bottoms` on the hub redirects there. Check the orders to remove, then save a CSV named with today's date and `allmoxy bottom`. The file stays in the browser.

Slab Measure prices slab doors and drawer fronts from the October 2026 list. On Vercel, drawing reads use the AI Gateway. Hand entry works without it.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `HUB_PASSWORD`.
3. Generate an authenticator secret with `node scripts/totp-secret.mjs` and set `HUB_TOTP_SECRET`.
4. Set `HUB_MFA_RECOVERY` to one reusable backup code (case sensitive). Change it in Vercel env anytime.
5. `npm install` and `npm run dev`.

Do not commit `.env.local`.
