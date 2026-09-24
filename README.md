# OneArtistHub Web

Official OneArtistHub commercial website for **www.oneartisthub.site**.

This repository is intentionally separate from the downloadable OneArtistHub software repository.

## Responsibilities

- Public marketing website
- Product/pricing presentation
- AJAX slide-out cart
- Software checkout
- Contact form
- Customer purchase confirmation
- Private sales/admin interface
- Integration with the existing OneArtistHub Cloudflare Worker
- Square payments through the existing Worker
- D1-backed orders/products through the Worker

## Architecture

```
www.oneartisthub.site
        |
        v
OneArtistHub-Web
        |
        v
existing OneArtistHub Connect Worker
        |
        +--> Square
        +--> D1
        +--> Resend
```

The downloadable OneArtistHub application is **not** stored or packaged from this repository.

## Planned products

- OneArtistHub Self-Hosted — $65 one time
- OneArtistHub Hosted — $45/year

Prices displayed in the storefront will eventually come from the Worker so the admin dashboard can update them without editing the public HTML.

## Development

This is currently a static-first Cloudflare Pages frontend. The existing payment/connect Worker remains the secure backend boundary.
