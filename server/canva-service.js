import https from 'https';
import querystring from 'querystring';

const CANVA_API_BASE = 'api.canva.com';
const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_PATH = '/rest/v1/oauth/token';

const SCOPES = [
  'design:content:read',
  'design:content:write',
  'design:meta:read',
  'brandtemplate:content:read',
  'brandtemplate:meta:read',
].join(' ');

// In-memory token store (persists per container instance)
let _tokens = null;

export const canvaTokens = {
  set: (t) => { _tokens = { ...t, expiresAt: Date.now() + (t.expires_in || 3600) * 1000 }; },
  get: () => _tokens,
  clear: () => { _tokens = null; },
  isValid: () => !!_tokens?.access_token,
};

// ── OAuth helpers ──────────────────────────────────────────────────────────
export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.CANVA_CLIENT_ID,
    redirect_uri: process.env.CANVA_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
  });
  return `${CANVA_AUTH_URL}?${params}`;
}

export async function exchangeCode(code) {
  const body = querystring.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.CANVA_REDIRECT_URI,
    client_id: process.env.CANVA_CLIENT_ID,
    client_secret: process.env.CANVA_CLIENT_SECRET,
  });
  return canvaPost(CANVA_TOKEN_PATH, body, 'application/x-www-form-urlencoded', false);
}

// ── Core HTTP helpers ──────────────────────────────────────────────────────
function canvaPost(path, body, contentType = 'application/json', auth = true) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const options = {
      hostname: CANVA_API_BASE,
      path,
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(payload),
        ...(auth && { 'Authorization': `Bearer ${_tokens?.access_token}` }),
      },
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve({ _raw: d, _status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function canvaGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CANVA_API_BASE,
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${_tokens?.access_token}` },
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve({ _raw: d, _status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Canva API calls ────────────────────────────────────────────────────────

// Map platform → Canva design_type name
export const PLATFORM_TO_DESIGN_TYPE = {
  instagram: 'instagram_post',
  facebook:  'facebook_post',
  twitter:   'twitter_post',
  linkedin:  'linkedin_post',
  tiktok:    'your_story',
};

export async function searchBrandTemplates(query, limit = 8) {
  const r = await canvaGet(`/rest/v1/brand-templates?query=${encodeURIComponent(query)}&limit=${limit}`);
  return r?.items || [];
}

export async function createAutofillJob(brandTemplateId, data) {
  return canvaPost('/rest/v1/autofills', { brand_template_id: brandTemplateId, data });
}

export async function pollAutofillJob(jobId, maxWait = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await sleep(2500);
    const r = await canvaGet(`/rest/v1/autofills/${jobId}`);
    const status = r?.job?.status;
    if (status === 'success') return r.job.result?.design || null;
    if (status === 'failed') throw new Error(`Autofill job failed: ${JSON.stringify(r)}`);
  }
  throw new Error('Autofill timeout');
}

export async function createBlankDesign(designTypeName) {
  const r = await canvaPost('/rest/v1/designs', {
    design_type: { type: 'preset', name: designTypeName },
  });
  return r?.design || null;
}

export async function getDesignMeta(designId) {
  const r = await canvaGet(`/rest/v1/designs/${designId}`);
  return r?.design || null;
}

// ── Main entry point called by the route ─────────────────────────────────
export async function generateCanvaDesigns({ caption, productName, platform }) {
  const designTypeName = PLATFORM_TO_DESIGN_TYPE[platform] || 'instagram_post';
  const results = [];

  // 1. Try brand templates autofill (best quality)
  try {
    const templates = await searchBrandTemplates(productName, 4);
    for (const tmpl of templates.slice(0, 4)) {
      try {
        const job = await createAutofillJob(tmpl.id, {
          // Standard field names – works if template has these fields
          title:       { type: 'text', text: productName.substring(0, 100) },
          description: { type: 'text', text: caption.substring(0, 200) },
        });
        if (job?.job?.id) {
          const design = await pollAutofillJob(job.job.id);
          if (design?.id) {
            const meta = await getDesignMeta(design.id);
            results.push({
              id: meta?.id || design.id,
              editUrl: meta?.urls?.edit_url || `https://www.canva.com/design/${design.id}/edit`,
              thumbnail: meta?.thumbnail?.url || null,
              source: 'brand_template',
              templateName: tmpl.title,
            });
          }
        }
      } catch (e) {
        console.warn(`Autofill template ${tmpl.id} failed:`, e.message);
      }
    }
  } catch (e) {
    console.warn('Brand template search failed:', e.message);
  }

  // 2. Fallback: blank canvas with the right dimensions
  if (results.length === 0) {
    try {
      const design = await createBlankDesign(designTypeName);
      if (design?.id) {
        results.push({
          id: design.id,
          editUrl: design.urls?.edit_url || `https://www.canva.com/design/${design.id}/edit`,
          thumbnail: design.thumbnail?.url || null,
          source: 'blank',
        });
      }
    } catch (e) {
      console.error('Blank design creation failed:', e.message);
    }
  }

  return { designs: results, designType: designTypeName };
}
