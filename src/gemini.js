// Thin wrapper around the Gemini API free tier for the two AI-assisted
// features: turning a quick-capture sentence into a structured task, and
// pulling action items out of a communication log entry. Both degrade
// gracefully to "do nothing, let the user type it themselves" if no key
// is configured — the app never depends on this to be usable.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-flash-lite-latest'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export const geminiEnabled = Boolean(API_KEY)

async function callGemini(prompt) {
  if (!geminiEnabled) throw new Error('No Gemini API key configured (VITE_GEMINI_API_KEY).')

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini request failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no content.')
  return JSON.parse(text)
}

// Turns free text like "call the dentist tomorrow at 3 about the filling"
// into a structured task. `nowIso` is passed in so the model has a
// concrete anchor for relative dates like "tomorrow".
export async function parseTaskFromText(text, nowIso = new Date().toISOString()) {
  const prompt = `You turn a quick, informally-typed note into a single structured task.
Current date/time (ISO 8601): ${nowIso}

Note: "${text}"

Reply with ONLY a JSON object, no markdown fences, matching exactly:
{
  "title": string (short, action-oriented, cleaned up but keep the user's intent),
  "dueAt": string | null (ISO 8601 datetime if a date/time was implied, else null),
  "estimatedMinutes": number | null (a reasonable guess for how long this takes, else null)
}`
  return callGemini(prompt)
}

// Splits a rougher note into 2-5 concrete, single-action steps — used by
// the "break this down" button on any task that feels too vague to start.
export async function breakDownTask(title, notes = '') {
  const prompt = `Break the following task into 2 to 5 concrete, single-action steps a person could each start in under a minute. Keep each step short (under 10 words) and in plain, direct language.

Task: "${title}"
${notes ? `Notes: "${notes}"` : ''}

Reply with ONLY a JSON object, no markdown fences, matching exactly:
{ "steps": string[] }`
  const result = await callGemini(prompt)
  return result.steps ?? []
}

// Pulls action items (things someone said they'd do) out of a
// communication log entry's free-text summary.
export async function extractActionItems(summary) {
  const prompt = `Read this recap of a phone call, text, or email exchange. Extract any concrete action items — things the user said they'd do, or things the other person said they'd do. Skip anything vague.

Recap: "${summary}"

Reply with ONLY a JSON object, no markdown fences, matching exactly:
{ "actionItems": string[] }`
  const result = await callGemini(prompt)
  return result.actionItems ?? []
}
