const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://levocao.pt';

const GUIDES = {
  'onde-levar-o-cao-no-algarve': {
    title: 'Onde levar o cão no Algarve | Locais pet-friendly',
    description: 'Descobre onde levar o cão no Algarve: restaurantes, praias, alojamentos, passeios e experiências pet-friendly, com informação prática da comunidade.',
    eyebrow: 'Guia pet-friendly no Algarve',
    heading: 'Onde levar o cão no Algarve',
    intro: 'Descobre restaurantes, praias, alojamentos, passeios e experiências onde podes ir com o teu cão no Algarve. Informação prática, simples e pensada para evitar surpresas.',
    resultsTitle: 'Locais no Algarve',
    districts: ['Faro']
  },
  'onde-levar-o-cao-no-alentejo': {
    title: 'Onde levar o cão no Alentejo | Locais pet-friendly',
    description: 'Descobre onde levar o cão no Alentejo: alojamentos, restaurantes, passeios e experiências pet-friendly, com informação prática da comunidade.',
    eyebrow: 'Guia pet-friendly no Alentejo',
    heading: 'Onde levar o cão no Alentejo',
    intro: 'Descobre alojamentos, restaurantes, passeios e experiências para ires com o teu cão no Alentejo, com informação prática reunida pela comunidade.',
    resultsTitle: 'Locais no Alentejo',
    districts: ['Beja', 'Évora', 'Portalegre']
  },
  'onde-levar-o-cao-em-lisboa': {
    title: 'Onde levar o cão em Lisboa | Locais pet-friendly',
    description: 'Descobre onde levar o cão em Lisboa: restaurantes, cafés, alojamentos, parques e passeios, com regras e condições práticas para cada local.',
    eyebrow: 'Guia pet-friendly em Lisboa',
    heading: 'Onde levar o cão em Lisboa',
    intro: 'Procuras onde levar o cão em Lisboa? Descobre restaurantes, cafés, alojamentos, parques, passeios e outros locais pet-friendly. Sempre que a informação está disponível, indicamos as condições de acesso e se foram confirmadas pelo estabelecimento ou pela comunidade.',
    resultsTitle: 'Locais em Lisboa',
    districts: ['Lisboa'],
    municipalities: ['Lisboa']
  }
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replaceElementText(html, id, value) {
  const pattern = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/[^>]+>)`, 'i');
  return html.replace(pattern, `$1${escapeHtml(value)}$2`);
}

function replaceElementHtml(html, id, value) {
  const pattern = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/[^>]+>)`, 'i');
  return html.replace(pattern, `$1${value}$2`);
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanText(value) {
  return String(value || '').replace(/\\s+/g, ' ').trim();
}

function truncate(value, max = 180) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\\s+\\S*$/, '')}…`;
}

function placeSlug(place) {
  const base = slugify(place.name || 'local');
  return place.id ? `${base}-${place.id}` : base;
}

function locationName(place) {
  return place.locality || place.city || place.municipality || place.district || 'Portugal';
}

function placeDescription(place) {
  return truncate(place.description || place.notes || '', 180);
}

function readSupabaseConfig(html) {
  const urlFromHtml = html.match(/const\s+SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/i)?.[1] || '';
  const keyFromHtml = html.match(/const\s+SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/i)?.[1] || '';
  const url = process.env.SUPABASE_URL || urlFromHtml;
  const anonKey = process.env.SUPABASE_ANON_KEY || keyFromHtml;
  if (!url || !anonKey) throw new Error('Supabase configuration unavailable');
  return { url, anonKey };
}

async function fetchPlaces(html) {
  const config = readSupabaseConfig(html);
  const fields = [
    'id', 'name', 'city', 'district', 'municipality', 'locality',
    'type', 'description', 'notes', 'photo_url'
  ].join(',');
  const url = `${config.url}/rest/v1/places?select=${encodeURIComponent(fields)}&is_active=eq.true&order=id.desc`;
  const response = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`
    }
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  return response.json();
}

function getGuidePlaces(places, guide) {
  const districts = Array.isArray(guide.districts) ? guide.districts : [];
  const municipalities = Array.isArray(guide.municipalities) ? guide.municipalities : [];

  return (places || [])
    .filter((place) => !districts.length || districts.includes(place.district))
    .filter((place) => !municipalities.length || municipalities.includes(place.municipality));
}

function renderGuideCards(places) {
  return places.map((place) => {
    const name = cleanText(place.name) || 'Local pet-friendly';
    const location = locationName(place);
    const type = cleanText(place.type) || 'Local pet-friendly';
    const description = placeDescription(place);
    const href = `/local/${encodeURIComponent(placeSlug(place))}`;
    const image = cleanText(place.photo_url);

    return `
      <article class="bg-white rounded-2xl border border-sand shadow-sm overflow-hidden">
        <a href="${escapeHtml(href)}" class="block text-inherit no-underline">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" class="w-full h-40 object-cover" loading="lazy" />` : ''}
          <div class="p-4">
            <p class="text-xs text-sage font-semibold mb-1">${escapeHtml(type)}</p>
            <h3 class="font-display font-bold text-xl leading-tight">${escapeHtml(name)}</h3>
            <p class="text-bark/55 text-sm mt-1">${escapeHtml(location)}</p>
            ${description ? `<p class="text-bark/70 text-sm mt-3">${escapeHtml(description)}</p>` : ''}
          </div>
        </a>
      </article>`;
  }).join('');
}

function injectGuideSeo(html, slug, guide, places) {
  const canonical = `${SITE_URL}/${slug}`;
  const image = `${SITE_URL}/mac.jpg`;
  const guidePlaces = getGuidePlaces(places, guide);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: guide.heading,
    description: guide.description,
    url: canonical,
    image,
    inLanguage: 'pt-PT',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Levo o Cão',
      url: `${SITE_URL}/`
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: guidePlaces.length,
      itemListElement: guidePlaces.map((place, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: cleanText(place.name),
        url: `${SITE_URL}/local/${encodeURIComponent(placeSlug(place))}`
      }))
    }
  };

  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(guide.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${escapeHtml(guide.description)}" />`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:title" content="${escapeHtml(guide.title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:description" content="${escapeHtml(guide.description)}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:url" content="${escapeHtml(canonical)}" />`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:title" content="${escapeHtml(guide.title)}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="twitter:description" content="${escapeHtml(guide.description)}" />`)
    .replace(/<div id="view-home">/i, '<div id="view-home" class="hidden">')
    .replace(/<div id="view-region" class="hidden">/i, '<div id="view-region">')
    .replace('</head>', `  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n</head>`);

  html = replaceElementText(html, 'region-eyebrow', guide.eyebrow);
  html = replaceElementText(html, 'region-title', guide.heading);
  html = replaceElementText(html, 'region-intro', guide.intro);
  html = replaceElementText(html, 'region-count-pill', `${guidePlaces.length} ${guidePlaces.length === 1 ? 'local' : 'locais'} nesta zona`);
  html = replaceElementText(html, 'region-results-title', guide.resultsTitle);
  html = replaceElementText(html, 'region-results-subtitle', `${guidePlaces.length} ${guidePlaces.length === 1 ? 'local encontrado' : 'locais encontrados'}`);
  html = replaceElementHtml(html, 'cards-region', renderGuideCards(guidePlaces));

  return html;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  try {
    const slug = String(req.query.slug || '').toLowerCase();
    const guide = GUIDES[slug];
    const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

    if (!guide) {
      res.statusCode = 404;
      return res.end(html.replace('</head>', '  <meta name="robots" content="noindex" />\n</head>'));
    }

    const places = await fetchPlaces(html);
    return res.status(200).end(injectGuideSeo(html, slug, guide, places));
  } catch (error) {
    console.error('Guide SEO render failed:', error);
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    return res.end('Temporariamente indisponível.');
  }
};
