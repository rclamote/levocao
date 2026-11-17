const fs = require('fs');
const path = require('path');
const ENGLISH_DESCRIPTIONS = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'translations/places-en.json'), 'utf8'));
const SITE_URL = 'https://levocao.pt';
const FALLBACK_SUPABASE_URL = 'https://mezeuxfoblyodjfaooan.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lemV1eGZvYmx5b2RqZmFvb2FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjcxNDEsImV4cCI6MjA5MTUwMzE0MX0.UCzhiqF1dSKLou-Ma9RUkYepn0tc1LK_OsfS_80f-94';

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function alternateLinks(portugueseUrl, englishUrl) {
  return [
    `<xhtml:link rel="alternate" hreflang="pt-PT" href="${escapeXml(portugueseUrl)}" />`,
    `<xhtml:link rel="alternate" hreflang="en" href="${escapeXml(englishUrl)}" />`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(portugueseUrl)}" />`
  ].join('');
}

async function fetchPlaces() {
  const supabaseUrl = process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
  const url = `${supabaseUrl}/rest/v1/places?select=id,name,created_at&is_active=eq.true&order=id.desc`;
  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  return response.json();
}

module.exports = async function handler(_req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  try {
    const places = await fetchPlaces();
    const entries = [
      `  <url><loc>${SITE_URL}/</loc>${alternateLinks(`${SITE_URL}/`, `${SITE_URL}/en/`)}<changefreq>weekly</changefreq><priority>1.0</priority></url>`,
      `  <url><loc>${SITE_URL}/en/</loc>${alternateLinks(`${SITE_URL}/`, `${SITE_URL}/en/`)}<changefreq>weekly</changefreq><priority>0.9</priority></url>`,
      `  <url><loc>${SITE_URL}/onde-levar-o-cao-no-algarve</loc>${alternateLinks(`${SITE_URL}/onde-levar-o-cao-no-algarve`, `${SITE_URL}/en/onde-levar-o-cao-no-algarve`)}<changefreq>weekly</changefreq><priority>0.9</priority></url>`,
      `  <url><loc>${SITE_URL}/en/onde-levar-o-cao-no-algarve</loc>${alternateLinks(`${SITE_URL}/onde-levar-o-cao-no-algarve`, `${SITE_URL}/en/onde-levar-o-cao-no-algarve`)}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      `  <url><loc>${SITE_URL}/onde-levar-o-cao-no-alentejo</loc>${alternateLinks(`${SITE_URL}/onde-levar-o-cao-no-alentejo`, `${SITE_URL}/en/onde-levar-o-cao-no-alentejo`)}<changefreq>weekly</changefreq><priority>0.9</priority></url>`,
      `  <url><loc>${SITE_URL}/en/onde-levar-o-cao-no-alentejo</loc>${alternateLinks(`${SITE_URL}/onde-levar-o-cao-no-alentejo`, `${SITE_URL}/en/onde-levar-o-cao-no-alentejo`)}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      `  <url><loc>${SITE_URL}/onde-levar-o-cao-em-lisboa</loc>${alternateLinks(`${SITE_URL}/onde-levar-o-cao-em-lisboa`, `${SITE_URL}/en/onde-levar-o-cao-em-lisboa`)}<changefreq>weekly</changefreq><priority>0.9</priority></url>`,
      `  <url><loc>${SITE_URL}/en/onde-levar-o-cao-em-lisboa</loc>${alternateLinks(`${SITE_URL}/onde-levar-o-cao-em-lisboa`, `${SITE_URL}/en/onde-levar-o-cao-em-lisboa`)}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      ...places.flatMap((place) => {
        const slug = `${slugify(place.name || 'local')}-${place.id}`;
        const portugueseUrl = `${SITE_URL}/local/${slug}`;
        const englishUrl = `${SITE_URL}/en/local/${slug}`;
        const translated = Boolean(ENGLISH_DESCRIPTIONS[String(place.id)]?.description);
        const links = translated ? alternateLinks(portugueseUrl, englishUrl) : '';
        const lastmod = place.created_at ? `<lastmod>${escapeXml(String(place.created_at).slice(0, 10))}</lastmod>` : '';
        const pt = `  <url><loc>${escapeXml(portugueseUrl)}</loc>${links}${lastmod}<changefreq>monthly</changefreq><priority>0.8</priority></url>`;
        if (!translated) return [pt];
        const en = `  <url><loc>${escapeXml(englishUrl)}</loc>${links}${lastmod}<changefreq>monthly</changefreq><priority>0.7</priority></url>`;
        return [pt, en];
      })
    ];

    return res.status(200).end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    return res.end('<?xml version="1.0" encoding="UTF-8"?><error>Temporarily unavailable</error>');
  }
};
