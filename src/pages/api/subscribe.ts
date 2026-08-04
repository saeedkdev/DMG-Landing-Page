import type { APIRoute } from 'astro';

export const prerender = false;

const attempts = new Map<string, number[]>();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const key = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 5) return Response.json({ error: 'Please wait a moment before trying again.' }, { status: 429 });
  recent.push(now);
  attempts.set(key, recent);

  let payload: { email?: unknown; website?: unknown };
  try { payload = await request.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (payload.website) return Response.json({ ok: true });

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });

  const apiKey = import.meta.env.BEEHIIV_API_KEY?.trim();
  const publicationId = import.meta.env.BEEHIIV_PUBLICATION_ID?.trim();
  if (!apiKey || !publicationId) return Response.json({ error: 'Subscriptions are temporarily unavailable.' }, { status: 503 });

  const response = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: true, double_opt_override: 'not_set', utm_source: 'dmgblockchain.com', utm_medium: 'website', utm_campaign: 'website-newsletter', referring_site: request.headers.get('referer') || 'https://www.dmgblockchain.com/' }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    console.error(`Beehiiv subscription failed with HTTP ${response.status}.`);
    return Response.json({ error: 'We could not complete the subscription. Please try again.' }, { status: response.status === 429 ? 429 : 502 });
  }

  return Response.json({ ok: true });
};
