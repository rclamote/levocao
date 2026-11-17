const fs = require('fs');
const path = require('path');

// Saved English descriptions are independent from Supabase's Portuguese originals.
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

function placeSlug(place) {
  const base = slugify(place.name || 'local');
  return place.id ? `${base}-${place.id}` : base;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, max) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function locationName(place) {
  return place.locality || place.city || place.municipality || place.district || 'Portugal';
}

function pageDescription(place) {
  const location = locationName(place);
  const source = cleanText(place.description || place.notes);
  if (source) return truncate(`${place.name}, em ${location}, aceita cães. ${source}`, 160);
  return truncate(`${place.name}, em ${location}, é um local pet-friendly. Consulta as condições para visitares este espaço com o teu cão.`, 160);
}

function schemaType(place) {
  const type = String(place.type || '').toLowerCase();
  if (type.includes('restaur') || type.includes('comer') || type.includes('beber')) return 'FoodEstablishment';
  if (type.includes('aloj')) return 'LodgingBusiness';
  if (type.includes('praia')) return 'Beach';
  if (type.includes('comercial')) return 'Store';
  if (type.includes('parque') || type.includes('soltar')) return 'Park';
  return 'Place';
}

async function fetchPlaces() {
  const supabaseUrl = process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
  const fields = [
    'id', 'name', 'city', 'district', 'municipality', 'locality', 'type',
    'description', 'notes', 'address', 'website', 'features', 'dog_status',
    'latitude', 'longitude', 'google_place_id', 'photo_url', 'created_at'
  ].join(',');
  const url = `${supabaseUrl}/rest/v1/places?select=${encodeURIComponent(fields)}&is_active=eq.true&order=id.desc`;
  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  return response.json();
}

function findPlace(places, rawSlug) {
  const slug = slugify(decodeURIComponent(String(rawSlug || '')));
  if (!slug) return null;

  const idMatch = slug.match(/-(\d+)$/);
  if (idMatch) {
    const byId = places.find((place) => String(place.id) === idMatch[1]);
    if (byId) return byId;
  }

  return places.find((place) => placeSlug(place) === slug)
    || places.find((place) => slugify(place.name) === slug)
    || null;
}

function injectSeo(html, place, language = 'pt') {
  const english = language === 'en';
  const translatedDescription = ENGLISH_DESCRIPTIONS[String(place.id)]?.description || '';
  const portugueseUrl = `${SITE_URL}/local/${encodeURIComponent(placeSlug(place))}`;
  const englishUrl = `${SITE_URL}/en/local/${encodeURIComponent(placeSlug(place))}`;
  const canonical = english ? englishUrl : portugueseUrl;
  const location = locationName(place);
  const title = english
    ? truncate(`${place.name} in ${location} | Dog-friendly Portugal`, 60)
    : truncate(`${place.name} em ${location} | Levo o Cão`, 60);
  const description = english
    ? truncate(translatedDescription || `${place.name} is a dog-friendly place in ${location}, Portugal. Check the details before visiting with your dog.`, 160)
    : pageDescription(place);
  const image = place.photo_url || `${SITE_URL}/mac.jpg`;
  const address = {
    '@type': 'PostalAddress',
    streetAddress: cleanText(place.address),
    addressLocality: cleanText(place.locality || place.city),
    addressRegion: cleanText(place.district),
    addressCountry: 'PT'
  };
  Object.keys(address).forEach((key) => {
    if (!address[key]) delete address[key];
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType(place),
    name: cleanText(place.name),
    description,
    url: canonical,
    image,
    address,
    ...(Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude)) ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: Number(place.latitude),
        longitude: Number(place.longitude)
      }
    } : {}),
    ...(place.website ? { sameAs: place.website } : {}),
    additionalProperty: [{
      '@type': 'PropertyValue',
      name: english ? 'Dogs allowed' : 'Aceita cães',
      value: english
        ? (place.dog_status === 'no' ? 'No' : place.dog_status === 'maybe' ? 'Restrictions apply' : 'Yes')
        : (place.dog_status === 'no' ? 'Não' : place.dog_status === 'maybe' ? 'Com restrições' : 'Sim')
    }]
  };

  if (english) {
    html = html.replace('<html lang="pt"', '<html lang="en"')
      .replace('<meta property="og:locale" content="pt_PT" />', '<meta property="og:locale" content="en_GB" />');
  }

  const alternates = translatedDescription ? [
    `  <link rel="alternate" hreflang="pt-PT" href="${escapeHtml(portugueseUrl)}" />`,
    `  <link rel="alternate" hreflang="en" href="${escapeHtml(englishUrl)}" />`,
    `  <link rel="alternate" hreflang="x-default" href="${escapeHtml(portugueseUrl)}" />`
  ].join('\n') + '\n' : '';
  // Do not let generic, untranslated English pages enter Google's index.
  const noindex = english && !translatedDescription ? '  <meta name="robots" content="noindex, follow" />\n' : '';

  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:url" content="${escapeHtml(canonical)}" />`)
    .replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:image" content="${escapeHtml(image)}" />`)
    .replace('</head>', `${alternates}${noindex}  <meta name="twitter:card" content="summary_large_image" />\n  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n</head>`);

  return html;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');

  try {
    const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const places = await fetchPlaces();
    const place = findPlace(places, req.query.slug);

    if (!place) {
      res.statusCode = 404;
      return res.end(html.replace('</head>', '  <meta name="robots" content="noindex" />\n</head>'));
    }

    return res.status(200).end(injectSeo(html, place, req.query.lang === 'en' ? 'en' : 'pt'));
  } catch (error) {
    console.error('Local SEO render failed:', error);
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    return res.end('Temporariamente indisponível.');
  }
};
