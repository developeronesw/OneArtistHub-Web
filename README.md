# OneArtistHub Web

Official OneArtistHub commercial website for **www.oneartisthub.site**.

This repository is intentionally separate from the downloadable OneArtistHub software repository.

## Architecture

```
www.oneartisthub.site
        |
        v
Cloudflare Pages (this repo)
        |
        v
connect.oneartisthub.site
OneArtistHub Connect Worker
        |
        +--> D1 commerce database
        +--> KV sessions / webhook idempotency
        +--> Square Checkout
        +--> Cloudflare Email Service
```

The downloadable OneArtistHub application is **not** stored or packaged from this repository.

## Commercial products

- OneArtistHub Self-Hosted — **$65 one time**
- OneArtistHub Hosted — **$45/year**

The browser never supplies an authoritative price. Product prices are read from D1 by the Worker at checkout.

## Admin

Open `/admin/` on the production site.

The dashboard includes:

- Glass SaaS control center
- Secure admin login with HttpOnly/Secure/SameSite session cookie
- CSRF token protection for state-changing admin calls
- Rate-limited login attempts
- Product and price management
- Order and customer views
- Square connection health
- Cloudflare Email Service configuration/test
- System/security status

No Square access token, Square secret, Cloudflare API token, admin password or other credential belongs in this repository.

## First-time backend setup

From the `OneArtistHub/connect-service` directory in Codespaces:

1. Create the production D1 database and add the binding:

```bash
npx wrangler d1 create oneartisthub-commerce --binding COMMERCE_DB --update-config
```

2. Apply the schema to the remote database:

```bash
npx wrangler d1 execute oneartisthub-commerce --remote --file=commerce-schema.sql
```

3. Generate the admin password hash locally. The password itself is never written to source control:

```bash
npm run admin:hash
```

Set the generated value as the Worker secret `ADMIN_PASSWORD_HASH`. Also set `ADMIN_EMAIL`.

4. Configure Worker secrets/variables in Cloudflare:

- `ADMIN_EMAIL` — Worker secret/variable
- `ADMIN_PASSWORD_HASH` — Worker secret
- `SOFTWARE_SQUARE_ACCESS_TOKEN` — Worker secret
- `SOFTWARE_SQUARE_LOCATION_ID` — Worker variable
- `SOFTWARE_SQUARE_WEBHOOK_SIGNATURE_KEY` — Worker secret
- `SOFTWARE_DOWNLOAD_URL` — Worker variable, when the self-hosted download is ready
- existing PayPal/Square Connect secrets remain in the Worker and are not copied into this repo

5. Configure Cloudflare Email Service for `oneartisthub.site`, then verify `contact@oneartisthub.site`. The Worker uses the native `EMAIL` binding; there is no SMTP/API credential in the frontend.

6. Deploy the Worker:

```bash
npm run validate
npm run deploy
```

7. Deploy this repository as a Cloudflare Pages project and attach `www.oneartisthub.site`.

## Security model

- Server-side product pricing
- Prepared D1 statements
- Square webhook HMAC validation
- Webhook event idempotency
- HTTPS-only public backend
- strict CORS to `https://www.oneartisthub.site`
- HttpOnly/Secure/SameSite admin sessions
- CSRF protection
- rate limiting on admin login
- security headers
- no card data stored
- no Square credentials returned to the browser
- minimal order/customer records

## Cloudflare custom domain

After the Pages project is deployed, add `www.oneartisthub.site` under the Pages project's **Custom domains** section. Cloudflare documents the custom-domain flow here: https://developers.cloudflare.com/pages/configuration/custom-domains/

