# Secrets & rotation

`.env` is git‑ignored and has never been committed to this repository
(`git log --all -- .env` is empty). `.env.example` contains placeholders only.
Even so, the values currently in the local `.env` have been shared in plain text
during development and **must be rotated before this backend is treated as
production**.

## Rotate now

| Secret | Where to rotate | Notes |
|--------|-----------------|-------|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ already rotated to fresh 48‑byte random values in local `.env` | Rotating invalidates all existing access/refresh tokens — every client must log in again. Set the same new values in the deploy environment. |
| `DATABASE_URL` (Neon password) | Neon console → project → Roles → reset password for `neondb_owner` | The pooled connection string is the one the app uses. |
| `GOOGLE_CLIENT_SECRET` | Google Cloud console → APIs & Services → Credentials → the OAuth client → *Reset secret* | `GOOGLE_CLIENT_ID` can stay. |
| `CLOUDINARY_API_SECRET` | Cloudinary console → Settings → Security → *Regenerate API secret* | `CLOUDINARY_CLOUD_NAME` / `API_KEY` can stay. |
| `MAIL_PASS` (Gmail app password) | Google account → Security → 2‑Step Verification → App passwords → revoke the old one, create a new one | |
| `MAILTRAP_TOKEN` | Mailtrap dashboard → API tokens | Only if Mailtrap is still used. |

## Rules going forward

* Never commit `.env`. Keep real values in the host's secret store (Vercel project
  env vars, etc.).
* Never paste secrets into chat, issues, or PRs.
* `ConfigService.getOrThrow(...)` is used for every credential, so a missing value
  fails fast at boot rather than silently degrading.
