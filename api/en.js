const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://levocao.pt';

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceStaticText(html, translations) {
  for (const [portuguese, english] of Object.entries(translations)) {
    // Text nodes only: keep existing JS behaviour, form values and category IDs intact.
    const pattern = new RegExp('(>\\s*)' + escapeRegExp(portuguese) + '(\\s*<)', 'g');
    html = html.replace(pattern, (_, before, after) => before + english + after);
  }
  return html;
}

module.exports = function handler(_req, res) {
  try {
    let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const translations = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'translations/interface-en.json'), 'utf8'));
    const title = 'Levo o Cão | Dog-friendly places in Portugal';
    const description = 'Discover dog-friendly restaurants, beaches, accommodation and walks in Portugal, with practical tips from our community.';
    html = replaceStaticText(html, translations)
      .replace('<html lang="pt"', '<html lang="en"')
      .replace(/<title>[\s\S]*?<\/title>/i, '<title>' + escapeHtml(title) + '</title>')
      .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, '<meta name="description" content="' + escapeHtml(description) + '" />')
      .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i, '<link rel="canonical" href="' + SITE_URL + '/en/" />')
      .replace(/<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?\s*>/i, '<meta property="og:locale" content="en_GB" />')
      .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i, '<meta property="og:title" content="' + escapeHtml(title) + '" />')
      .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, '<meta property="og:description" content="' + escapeHtml(description) + '" />')
      .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i, '<meta property="og:url" content="' + SITE_URL + '/en/" />')
      .replace('</head>', [
        '  <link rel="alternate" hreflang="pt-PT" href="' + SITE_URL + '/" />',
        '  <link rel="alternate" hreflang="en" href="' + SITE_URL + '/en/" />',
        '  <link rel="alternate" hreflang="x-default" href="' + SITE_URL + '/" />',
        '</head>'
      ].join('\n'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).end(html);
  } catch (error) {
    console.error('English homepage render failed:', error);
    return res.status(500).end('Temporarily unavailable');
  }
};
