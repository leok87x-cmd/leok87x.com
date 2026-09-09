# leok87x.com

Personal site for Leonardo De Moura Rocha Lima. Static HTML, CSS, and a few lines of JS. No build step.

## Layout

```
index.html        landing page (curriculum)
404.html          not-found page served by CloudFront
css/style.css     all styles, dark by default, light via prefers-color-scheme
js/main.js        footer year + scroll reveal
assets/           photo, favicon
posts/            reserved for daily writing (empty for now)
infra/            AWS CDK stack (see Deploy)
```

## Run locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080. Absolute paths (`/css/...`, `/assets/...`) assume the site is served from the domain root.

## Deploy

AWS CDK stack in `infra/` (TypeScript). Serves the repo root from a private S3 bucket behind CloudFront at `https://www.leok87x.com`, with a second CloudFront distribution redirecting `leok87x.com` to `www`. One ACM certificate covers both names; Route53 alias records point at the distributions. CloudFront Functions handle the apex redirect and directory-style URLs (`/posts/foo/` serves `/posts/foo/index.html`).

```
infra/bin/site.ts            stack entrypoint (account, region, zone id)
infra/lib/site-stack.ts      S3, CloudFront, ACM, Route53, bucket deployment
infra/functions/*.js         CloudFront Functions
```

Deploy (uploads the site and invalidates CloudFront):

```
aws sso login --profile money
cd infra && npm install
AWS_PROFILE=money npx cdk deploy
```

Region is `us-east-1` because CloudFront requires the certificate there. The account is already bootstrapped.

## Next

- Daily posts under `posts/`, with an index and RSS feed.
