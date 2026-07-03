/**
 * Daily scheduled rebuild.
 *
 * The articles freshness window (curated items ≤ 14 days) is only re-evaluated
 * at build time. Between manual pushes, a stale item could linger past 14 days,
 * so this function triggers a build once a day to prune aged-out articles.
 *
 * Setup:
 *   1. Netlify → Site config → Build & deploy → Build hooks → create a hook.
 *   2. Netlify → Site config → Environment variables → set BUILD_HOOK_URL to
 *      that hook URL.
 * No secret is stored in the repo — the URL comes from the environment.
 */

export default async () => {
  const hook = process.env.BUILD_HOOK_URL
  if (!hook) {
    console.warn('BUILD_HOOK_URL not set — skipping scheduled rebuild.')
    return new Response('BUILD_HOOK_URL not configured', { status: 200 })
  }

  const res = await fetch(hook, { method: 'POST' })
  console.log(`Triggered build hook: ${res.status}`)
  return new Response(`Rebuild triggered (${res.status})`, { status: 200 })
}

export const config = {
  schedule: '@daily',
}
