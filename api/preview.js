const SITE_URL = 'https://levocao.pt';

function sanitizePath(value) {
  const path = String(value || '/');
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

module.exports = async function handler(req, res) {
  try {
    const path = sanitizePath(req.query.path || '/');
    const upstream = await fetch(`${SITE_URL}${path}`, {
      headers: {
        'user-agent': 'levocao-confirmation-preview/1.0'
      }
    });

    if (!upstream.ok) {
      res.status(upstream.status).send('Não foi possível carregar a versão atual do site.');
      return;
    }

    let html = await upstream.text();

    html = html.replace(
      /<meta\s+name="robots"[^>]*>/i,
      '<meta name="robots" content="noindex, nofollow" />'
    );

    if (!/<meta\s+name="robots"/i.test(html)) {
      html = html.replace(
        '</head>',
        '<meta name="robots" content="noindex, nofollow" />\n</head>'
      );
    }

    html = html.replace(
      '</head>',
      '<link rel="stylesheet" href="/confirmation-preview.css?v=2" />\n</head>'
    );

    html = html.replace(
      '</body>',
      '<script src="/confirmation-preview.js?v=2"></script>\n</body>'
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(html);
  } catch (error) {
    console.error('Preview render failed:', error);
    res.status(500).send('Não foi possível criar a pré-visualização.');
  }
};
