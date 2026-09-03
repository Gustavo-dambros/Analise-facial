"""
SEO / GEO / IndexNow router.
Public endpoints: robots, sitemap, llms, feed, og-image, IndexNow trigger, blog markdown.
All routes are public and cacheable.
"""
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import PlainTextResponse
from app.core.config import settings
import hashlib
import httpx
from datetime import datetime, timezone

router = APIRouter()

CANONICAL = "https://facemax.pro"
CANONICAL_WWW = "https://www.facemax.pro"
# Fallback if settings.FRONTEND_URL is custom
FRONTEND = CANONICAL

# --- Helpers ---
PUBLIC_PAGES = [
    ("/", "weekly", "1.0"),
    ("/login", "monthly", "0.8"),
    ("/signup", "monthly", "0.8"),
    ("/forgot-password", "monthly", "0.6"),
    ("/blog", "weekly", "0.9"),
    ("/faq", "monthly", "0.7"),
    ("/contato", "monthly", "0.7"),
]

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

# --- robots.txt ---
@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots():
    # Explicit AI bot rules + sitemap
    body = f"""User-agent: *
Allow: /

# AI / Generative Engine bots — explicit allow for public, disallow private
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ByteSpider
Allow: /

# Disallow private areas for all bots
Disallow: /dashboard/
Disallow: /api/
Disallow: /checkout
Disallow: /professional/dashboard

Sitemap: {CANONICAL}/sitemap.xml
Sitemap: {CANONICAL}/feed.xml
"""
    return PlainTextResponse(body, media_type="text/plain")

# --- sitemap.xml dinâmico com lastmod ---
@router.get("/sitemap.xml")
async def sitemap():
    now = datetime.now(timezone.utc).date().isoformat()
    urls = ""
    for loc, freq, prio in PUBLIC_PAGES:
        urls += f"""  <url>
    <loc>{CANONICAL}{loc}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{prio}</priority>
  </url>
"""
    # TODO: append dynamic blog posts with real lastmod from DB
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
{urls}</urlset>"""
    return Response(content=xml, media_type="application/xml", headers={"Cache-Control": "public, max-age=3600"})

# --- llms.txt ---
@router.get("/llms.txt", response_class=PlainTextResponse)
async def llms_txt():
    body = f"""# FaceMax — llms.txt
# Canonical: {CANONICAL}
# Generated: {_now_iso()}

> FaceMax é a plataforma brasileira de análise estética facial por IA — harmonia, simetria, terços faciais, visagismo.

## Estrutura
- Home: {CANONICAL}/
- Blog: {CANONICAL}/blog
- FAQ: {CANONICAL}/faq
- Contato: {CANONICAL}/contato
- API: {CANONICAL}/api/v1 — ver {CANONICAL}/llms-full.txt

## Produtos
- FaceMax Free: análise facial básica, terços + simetria
- FaceMax Pro: relatório completo + visagismo (cabelo/barba/óculos)
- FaceMax Enterprise: time/avaliação profissional

## Artigos em destaque
- Guia de Foto: {CANONICAL}/dashboard/photo-guide
- Ver feed: {CANONICAL}/feed.xml
- Sitemap: {CANONICAL}/sitemap.xml

## Contato
- Suporte: suporte@facemax.pro
"""
    return PlainTextResponse(body)

@router.get("/llms-full.txt", response_class=PlainTextResponse)
async def llms_full():
    body = f"""# FaceMax — llms-full.txt
# Full structure for LLM consumption
# Canonical: {CANONICAL}

## Sitemap
{CANONICAL}/sitemap.xml

## Blog
{CANONICAL}/blog — Markdown: {{url}}.md

## API OpenAPI
{CANONICAL}/api/v1/openapi.json

## Stack
Frontend React+Vite, Backend FastAPI, Supabase Auth, Mercado Pago, OpenRouter Gemma 26B

## Páginas públicas (SSR)
- / : Home — SoftwareApplication + Organization
- /blog/:slug : BlogPosting + Author Person
- /faq : FAQPage
- /contato : ContactPage

## Headers
- X-Robots-Tag: noindex, nofollow on /dashboard, /api, /checkout
"""
    return PlainTextResponse(body)

# --- RSS/Atom feed ---
@router.get("/feed.xml")
async def feed():
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S %z")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>FaceMax Blog</title>
  <link>{CANONICAL}/blog</link>
  <description>Análises, visagismo e harmonia facial por IA + especialistas</description>
  <language>pt-BR</language>
  <lastBuildDate>{now}</lastBuildDate>
  <atom:link href="{CANONICAL}/feed.xml" rel="self" type="application/rss+xml" />
  <!-- TODO: inject items from DB -->
</channel>
</rss>"""
    return Response(content=xml, media_type="application/rss+xml", headers={"Cache-Control": "public, max-age=3600"})

# --- Blog markdown route (stub, pulls from DB when available) ---
@router.get("/blog/{slug}.md", response_class=PlainTextResponse)
async def blog_markdown(slug: str):
    # TODO: fetch post by slug from DB; return 404 if not found
    # For now, return soft 404 handling example
    raise HTTPException(status_code=404, detail="Post não encontrado")

# --- Dynamic OG image (placeholder — returns SVG, upgrade to PNG via cairosvg) ---
@router.get("/og-image")
async def og_image(title: str = "FaceMax — Elite da Estética"):
    svg = f"""<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="630" fill="#0a0a0a"/>
<text x="60" y="280" font-family="Urbanist, sans-serif" font-size="64" font-weight="800" fill="#d3ab39">{title[:60]}</text>
<text x="60" y="360" font-family="Noto Sans JP" font-size="28" fill="#94a3b8">facemax.pro — análise facial por IA + especialistas</text>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400", "Content-Disposition": "inline"})

# --- IndexNow trigger (Bing/Yandex) ---
INDEXNOW_KEY = "facemax-indexnow-key"  # TODO: move to settings, verify via /{key}.txt
INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"

@router.post("/indexnow")
async def indexnow_trigger(request: Request, url: str = None):
    # Called internally on publish/update: POST /api/v1/seo/indexnow?url=https://facemax.pro/blog/slug
    target = url or (await request.json()).get("url") if request.headers.get("content-type","").startswith("application/json") else None
    if not target:
        raise HTTPException(status_code=400, detail="url required")
    if not target.startswith(CANONICAL):
        raise HTTPException(status_code=400, detail="url must be canonical")
    payload = {
        "host": "facemax.pro",
        "key": INDEXNOW_KEY,
        "keyLocation": f"{CANONICAL}/{INDEXNOW_KEY}.txt",
        "urlList": [target],
    }
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(INDEXNOW_ENDPOINT, json=payload)
            return {"status": r.status_code, "url": target}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.get(f"/{INDEXNOW_KEY}.txt", response_class=PlainTextResponse)
async def indexnow_key():
    return PlainTextResponse(INDEXNOW_KEY)
