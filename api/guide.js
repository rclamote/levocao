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
    resultsTitle: 'Locais no Algarve'
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

function injectGuideSeo(html, slug, guide) {
  const canonical = `${SITE_URL}/${slug}`;
  const image = `${SITE_URL}/mac.jpg`;
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
  html = replaceElementText(html, 'region-results-title', guide.resultsTitle);

  return html;
}

module.exports = function handler(req, res) {
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

    return res.status(200).end(injectGuideSeo(html, slug, guide));
  } catch (error) {
    console.error('Guide SEO render failed:', error);
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    return res.end('Temporariamente indisponível.');
  }
};
