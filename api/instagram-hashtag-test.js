const GRAPH_API_VERSION = 'v27.0';
const DEFAULT_HASHTAG = 'levocao';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

function isAuthorized(req) {
  if (process.env.VERCEL_ENV === 'preview') return true;

  const secret = process.env.CRON_SECRET;
  const authorization = req.headers?.authorization || '';
  return Boolean(secret) && authorization === `Bearer ${secret}`;
}

async function graphRequest(path, params, accessToken) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    const error = new Error(data.error?.message || `Instagram API returned ${response.status}`);
    error.status = response.status;
    error.code = data.error?.code;
    error.type = data.error?.type;
    throw error;
  }

  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return sendJson(res, 404, { ok: false, error: 'Not found' });
  }

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramUserId = process.env.INSTAGRAM_USER_ID;
  const hashtag = String(process.env.INSTAGRAM_HASHTAG || DEFAULT_HASHTAG)
    .replace(/^#/, '')
    .trim();

  if (!accessToken || !instagramUserId) {
    return sendJson(res, 503, {
      ok: false,
      error: 'Instagram environment variables are not configured'
    });
  }

  try {
    const search = await graphRequest('ig_hashtag_search', {
      user_id: instagramUserId,
      q: hashtag
    }, accessToken);
    const hashtagId = search.data?.[0]?.id;

    if (!hashtagId) {
      return sendJson(res, 200, {
        ok: true,
        hashtag: `#${hashtag}`,
        hashtagFound: false,
        count: 0,
        posts: []
      });
    }

    const recent = await graphRequest(`${hashtagId}/recent_media`, {
      user_id: instagramUserId,
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}',
      limit: 25
    }, accessToken);
    const posts = Array.isArray(recent.data) ? recent.data : [];

    return sendJson(res, 200, {
      ok: true,
      hashtag: `#${hashtag}`,
      hashtagFound: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('Instagram hashtag test failed', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });

    return sendJson(res, 502, {
      ok: false,
      error: error.message,
      code: error.code || null,
      type: error.type || null
    });
  }
};
