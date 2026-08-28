const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v26.0';
const HASHTAG = 'levocao';

function json(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

async function readJson(url, label) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `${label} respondeu com ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método não permitido.' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.authorization !== `Bearer ${cronSecret}`) {
    return json(response, 401, { error: 'Não autorizado.' });
  }

  const instagramUserId = process.env.INSTAGRAM_USER_ID;
  const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!instagramUserId || !instagramAccessToken || !supabaseUrl || !supabaseServiceRoleKey) {
    return json(response, 503, { error: 'A integração com o Instagram ainda não está configurada.' });
  }

  try {
    const hashtagSearchUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/ig_hashtag_search`);
    hashtagSearchUrl.searchParams.set('user_id', instagramUserId);
    hashtagSearchUrl.searchParams.set('q', HASHTAG);
    hashtagSearchUrl.searchParams.set('access_token', instagramAccessToken);

    const hashtagResult = await readJson(hashtagSearchUrl, 'A pesquisa da hashtag');
    const hashtagId = hashtagResult?.data?.[0]?.id;
    if (!hashtagId) return json(response, 200, { found: 0, saved: 0 });

    const mediaUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${hashtagId}/recent_media`);
    mediaUrl.searchParams.set('user_id', instagramUserId);
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp');
    mediaUrl.searchParams.set('limit', '50');
    mediaUrl.searchParams.set('access_token', instagramAccessToken);

    const mediaResult = await readJson(mediaUrl, 'A pesquisa de publicações');
    const rows = (mediaResult?.data || [])
      .filter((post) => post.id && post.permalink)
      .map((post) => ({
        instagram_media_id: post.id,
        permalink: post.permalink,
        caption: post.caption || null,
        media_type: post.media_type || null,
        media_url: post.media_url || null,
        thumbnail_url: post.thumbnail_url || null,
        posted_at: post.timestamp || null,
        source: 'hashtag',
        status: 'pending'
      }));

    if (!rows.length) return json(response, 200, { found: 0, saved: 0 });

    const saveResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/instagram_posts?on_conflict=instagram_media_id`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify(rows)
    });

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      throw new Error(`Não foi possível guardar as publicações (${saveResponse.status}): ${errorText.slice(0, 200)}`);
    }

    return json(response, 200, { found: rows.length, saved: rows.length });
  } catch (error) {
    console.error('Erro ao sincronizar #levocao:', error);
    return json(response, 500, { error: 'Não foi possível sincronizar as publicações.' });
  }
}
