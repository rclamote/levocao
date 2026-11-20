module.exports = function handler(_req, res) {
  const key = process.env.GOOGLE_MAPS_BROWSER_KEY?.trim();
  res.setHeader('Cache-Control', 'no-store');

  if (!key) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(503).end('// Google Places unavailable');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/js');
  url.search = new URLSearchParams({
    key,
    v: 'weekly',
    libraries: 'places',
    callback: 'initGooglePlaces'
  }).toString();
  res.setHeader('Location', url.href);
  return res.status(302).end();
};
