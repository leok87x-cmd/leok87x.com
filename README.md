# leok87x.com

Personal site for Leonardo De Moura Rocha Lima. Static HTML, CSS, and a few lines of JS. No build step.

## Layout

```
index.html        landing page (curriculum)
css/style.css     all styles, dark by default, light via prefers-color-scheme
js/main.js        footer year + scroll reveal
assets/           photo, favicon
posts/            reserved for daily writing (empty for now)
```

## Run locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080. Absolute paths (`/css/...`, `/assets/...`) assume the site is served from the domain root.

## Deploy

Any static host works (Cloudflare Pages, Netlify, GitHub Pages, S3 + CloudFront, or a plain nginx on Hetzner). Point it at this directory.

## Next

- Daily posts under `posts/`, with an index and RSS feed.
