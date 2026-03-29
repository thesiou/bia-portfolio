const SESSION_COOKIE = 'origami_admin';
const OAUTH_STATE_COOKIE = 'origami_oauth_state';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

export default {
  async fetch(request, env) {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      console.error(error);
      return json({ error: 'Internal server error' }, 500);
    }
  }
};

async function routeRequest(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/origami-api/health') {
    return json({ ok: true, now: new Date().toISOString() });
  }

  if (pathname === '/origami-api/auth/login' && request.method === 'GET') {
    return handleLogin(request, env);
  }

  if (pathname === '/origami-api/auth/callback' && request.method === 'GET') {
    return handleCallback(request, env);
  }

  if (pathname === '/origami-api/auth/logout' && request.method === 'POST') {
    return handleLogout();
  }

  if (pathname === '/origami-api/session' && request.method === 'GET') {
    return handleSession(request, env);
  }

  if (pathname === '/origami-api/content' && request.method === 'GET') {
    return handleGetContent(request, env);
  }

  if (pathname === '/origami-api/content' && request.method === 'POST') {
    return handleSaveContent(request, env);
  }

  if (pathname === '/origami-api/upload' && request.method === 'POST') {
    return handleUpload(request, env);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleLogin(request, env) {
  requireOAuthConfig(env);

  const statePayload = {
    nonce: crypto.randomUUID(),
    exp: epochNow() + OAUTH_STATE_TTL_SECONDS
  };
  const stateToken = await createSignedToken(statePayload, env.COOKIE_SECRET);

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  authUrl.searchParams.set('scope', 'read:user');
  authUrl.searchParams.set('state', stateToken);

  const response = redirect(authUrl.toString());
  response.headers.append('Set-Cookie', makeCookie(OAUTH_STATE_COOKIE, stateToken, {
    maxAge: OAUTH_STATE_TTL_SECONDS,
    path: '/origami-api/auth',
    httpOnly: true
  }));
  return response;
}

async function handleCallback(request, env) {
  requireOAuthConfig(env);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (!code || !returnedState) {
    return json({ error: 'Missing OAuth callback parameters' }, 400);
  }

  const cookies = parseCookies(request.headers.get('Cookie'));
  const cookieState = cookies[OAUTH_STATE_COOKIE];

  if (!cookieState || cookieState !== returnedState) {
    return json({ error: 'Invalid OAuth state' }, 403);
  }

  const validState = await verifySignedToken(returnedState, env.COOKIE_SECRET);
  if (!validState) {
    return json({ error: 'Expired OAuth state' }, 403);
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code
    })
  });

  const tokenPayload = await tokenRes.json();
  if (!tokenRes.ok || !tokenPayload.access_token) {
    return json({ error: 'GitHub token exchange failed' }, 401);
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${tokenPayload.access_token}`,
      'User-Agent': 'origami-admin'
    }
  });
  const userPayload = await userRes.json();

  if (!userRes.ok || !userPayload.login) {
    return json({ error: 'Could not read GitHub user profile' }, 401);
  }

  const allowedUsers = (env.OAUTH_ALLOWED_USERS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowedUsers.length > 0 && !allowedUsers.includes(String(userPayload.login).toLowerCase())) {
    return json({ error: 'User is not allowed to access admin' }, 403);
  }

  const sessionToken = await createSignedToken({
    username: userPayload.login,
    exp: epochNow() + SESSION_TTL_SECONDS
  }, env.COOKIE_SECRET);

  const response = redirect('/origami/');
  response.headers.append('Set-Cookie', makeCookie(SESSION_COOKIE, sessionToken, {
    maxAge: SESSION_TTL_SECONDS,
    path: '/origami-api',
    httpOnly: true
  }));
  response.headers.append('Set-Cookie', makeCookie(OAUTH_STATE_COOKIE, '', {
    maxAge: 0,
    path: '/origami-api/auth',
    httpOnly: true
  }));

  return response;
}

function handleLogout() {
  const response = json({ ok: true });
  response.headers.append('Set-Cookie', makeCookie(SESSION_COOKIE, '', {
    maxAge: 0,
    path: '/origami-api',
    httpOnly: true
  }));
  return response;
}

async function handleSession(request, env) {
  const session = await getSessionFromRequest(request, env);
  if (!session) {
    return json({ authenticated: false });
  }

  return json({ authenticated: true, username: session.username });
}

async function handleGetContent(request, env) {
  const session = await getSessionFromRequest(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);

  requireRepoConfig(env);

  const file = await getRepoFile(env, env.GH_DATA_PATH, env.GH_BRANCH || 'main');
  let content;
  try {
    content = JSON.parse(file.content);
  } catch {
    return json({ error: 'Repository JSON is invalid' }, 500);
  }

  return json({
    content,
    sha: file.sha,
    path: env.GH_DATA_PATH,
    branch: env.GH_BRANCH || 'main'
  });
}

async function handleSaveContent(request, env) {
  const session = await getSessionFromRequest(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);

  requireRepoConfig(env);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  if (!payload || typeof payload !== 'object') {
    return json({ error: 'Missing payload' }, 400);
  }

  if (!payload.sha || typeof payload.sha !== 'string') {
    return json({ error: 'Missing file sha' }, 400);
  }

  if (!payload.content || typeof payload.content !== 'object') {
    return json({ error: 'Missing content object' }, 400);
  }

  const commitMessage = String(payload.message || `chore(admin): update portfolio content`).slice(0, 120);
  const contentText = `${JSON.stringify(payload.content, null, 2)}\n`;

  const saveResult = await putRepoFile(env, {
    path: env.GH_DATA_PATH,
    branch: env.GH_BRANCH || 'main',
    sha: payload.sha,
    contentBase64: utf8ToBase64(contentText),
    message: commitMessage,
    committerName: session.username,
    committerEmail: `${session.username}@users.noreply.github.com`
  });

  return json({
    ok: true,
    sha: saveResult.content.sha,
    commitSha: saveResult.commit.sha
  });
}

async function handleUpload(request, env) {
  const session = await getSessionFromRequest(request, env);
  if (!session) return json({ error: 'Unauthorized' }, 401);

  requireRepoConfig(env);

  const form = await request.formData();
  const path = String(form.get('path') || '').trim();
  const message = String(form.get('message') || '').trim();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return json({ error: 'Missing upload file' }, 400);
  }

  if (!isValidUploadPath(path)) {
    return json({ error: 'Invalid upload path. Use images/... and avoid ..' }, 400);
  }

  if (file.size > 25 * 1024 * 1024) {
    return json({ error: 'File is too large for this endpoint (max 25MB)' }, 400);
  }

  let existingSha = undefined;
  try {
    const existing = await getRepoFileMeta(env, path, env.GH_BRANCH || 'main');
    existingSha = existing?.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const bytes = await file.arrayBuffer();
  const saveResult = await putRepoFile(env, {
    path,
    branch: env.GH_BRANCH || 'main',
    sha: existingSha,
    contentBase64: arrayBufferToBase64(bytes),
    message: message || `chore(admin): upload ${path}`,
    committerName: session.username,
    committerEmail: `${session.username}@users.noreply.github.com`
  });

  return json({
    ok: true,
    path,
    sha: saveResult.content.sha,
    commitSha: saveResult.commit.sha
  });
}

async function getSessionFromRequest(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  return verifySignedToken(token, env.COOKIE_SECRET);
}

function parseCookies(cookieHeader = '') {
  const result = {};
  cookieHeader.split(';').forEach(pair => {
    const [key, ...valueParts] = pair.trim().split('=');
    if (!key) return;
    result[key] = decodeURIComponent(valueParts.join('='));
  });
  return result;
}

function makeCookie(name, value, options = {}) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || '/'}`,
    `Max-Age=${options.maxAge ?? SESSION_TTL_SECONDS}`,
    'Secure',
    `SameSite=${options.sameSite || 'Lax'}`
  ];

  if (options.httpOnly !== false) {
    attributes.push('HttpOnly');
  }

  return attributes.join('; ');
}

function epochNow() {
  return Math.floor(Date.now() / 1000);
}

async function createSignedToken(payload, secret) {
  const body = base64UrlEncodeUtf8(JSON.stringify(payload));
  const sig = await sign(body, secret);
  return `${body}.${sig}`;
}

async function verifySignedToken(token, secret) {
  const [body, signature] = String(token).split('.');
  if (!body || !signature) return null;

  const expected = await sign(body, secret);
  if (!timingSafeEqual(signature, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(base64UrlDecodeUtf8(body));
  } catch {
    return null;
  }

  if (!payload?.exp || payload.exp < epochNow()) return null;
  return payload;
}

async function sign(value, secret) {
  if (!secret) throw new Error('Missing COOKIE_SECRET');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64UrlEncodeBytes(new Uint8Array(sigBytes));
}

function timingSafeEqual(a, b) {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left[i] ^ right[i];
  }
  return diff === 0;
}

function base64UrlEncodeUtf8(value) {
  return base64ToBase64Url(utf8ToBase64(value));
}

function base64UrlDecodeUtf8(value) {
  return base64ToUtf8(base64UrlToBase64(value));
}

function base64UrlEncodeBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64ToBase64Url(btoa(binary));
}

function base64ToBase64Url(value) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBase64(value) {
  const base = value.replace(/-/g, '+').replace(/_/g, '/');
  const mod = base.length % 4;
  if (mod === 0) return base;
  return `${base}${'='.repeat(4 - mod)}`;
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(value) {
  const binary = atob(String(value).replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function repoContentPath(env, path) {
  const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
  return `https://api.github.com/repos/${encodeURIComponent(env.GH_OWNER)}/${encodeURIComponent(env.GH_REPO)}/contents/${encodedPath}`;
}

async function getRepoFile(env, path, branch) {
  const url = new URL(repoContentPath(env, path));
  url.searchParams.set('ref', branch);
  const payload = await githubRequest(env, url.toString(), { method: 'GET' });

  return {
    sha: payload.sha,
    content: base64ToUtf8(payload.content)
  };
}

async function getRepoFileMeta(env, path, branch) {
  const url = new URL(repoContentPath(env, path));
  url.searchParams.set('ref', branch);
  const payload = await githubRequest(env, url.toString(), { method: 'GET' });
  return { sha: payload.sha };
}

async function putRepoFile(env, params) {
  const payload = {
    message: params.message,
    content: params.contentBase64,
    branch: params.branch,
    committer: {
      name: params.committerName,
      email: params.committerEmail
    }
  };

  if (params.sha) payload.sha = params.sha;

  return githubRequest(env, repoContentPath(env, params.path), {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function githubRequest(env, url, init) {
  if (!env.GITHUB_REPO_TOKEN) {
    throw new Error('Missing GITHUB_REPO_TOKEN secret');
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_REPO_TOKEN}`,
      'User-Agent': 'origami-admin',
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const bodyText = await response.text();
    const error = new Error(`GitHub API error ${response.status}: ${bodyText}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function isValidUploadPath(path) {
  if (!path) return false;
  if (!path.startsWith('images/')) return false;
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  if (path.includes('\\')) return false;
  return true;
}

function requireOAuthConfig(env) {
  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET || !env.COOKIE_SECRET) {
    throw new Error('Missing OAuth or cookie secrets');
  }
}

function requireRepoConfig(env) {
  if (!env.GH_OWNER || !env.GH_REPO || !env.GH_DATA_PATH || !env.COOKIE_SECRET) {
    throw new Error('Missing repo configuration');
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function redirect(location, status = 302) {
  return new Response(null, {
    status,
    headers: {
      Location: location
    }
  });
}
