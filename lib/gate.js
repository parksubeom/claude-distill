// Two-stage gate that decides whether a transcript is worth analyzing.
// Cuts main-LLM calls by ~10× — most sessions never reach extract.
//
//   1. heuristicGate(t)  — pure local checks (turn count, tool_use, error keywords)
//   2. llmGate(t, opts)  — Haiku yes/no, only if API key available
//
// Both fail-open: if anything goes wrong they return pass:true so we don't
// silently lose insights to a flaky filter.

const ERROR_RE = /\b(error|failed|EACCES|EPERM|ENOENT|exception|cannot|undefined is not|null is not|panic:|fatal:|FATAL|throw |throws |traceback|stack trace|denied|forbidden|EADDRINUSE|EBUSY|timed out|timeout)\b/i;

const MIN_TURNS = 8;

function stringifyContent(c) {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c.map((x) => {
      if (x.type === 'text') return x.text || '';
      if (x.type === 'tool_use') return `[tool:${x.name}]`;
      if (x.type === 'tool_result') return x.text_preview || '';
      return `[${x.type}]`;
    }).join(' ');
  }
  return '';
}

function heuristicGate(t) {
  if (!t || !Array.isArray(t.turns) || t.turns.length < MIN_TURNS) {
    return { pass: false, reason: `too_short(${t && t.turns ? t.turns.length : 0})` };
  }

  let toolUseCount = 0;
  let textBlob = '';

  for (const turn of t.turns) {
    if (Array.isArray(turn.content)) {
      for (const c of turn.content) {
        if (c.type === 'tool_use') toolUseCount++;
        if (c.type === 'tool_result' && typeof c.text_preview === 'string') textBlob += '\n' + c.text_preview;
        if (c.type === 'text' && typeof c.text === 'string') textBlob += '\n' + c.text;
      }
    } else if (typeof turn.content === 'string') {
      textBlob += '\n' + turn.content;
    }
  }

  if (toolUseCount === 0) return { pass: false, reason: 'no_tool_use' };
  if (!ERROR_RE.test(textBlob)) return { pass: false, reason: 'no_error_keywords' };

  return { pass: true, reason: 'ok', toolUseCount };
}

function buildGateSample(t) {
  const lines = [];
  lines.push(`Total turns: ${t.turns.length}`);
  const firstUser = t.turns.find((x) => x.type === 'user');
  if (firstUser) {
    lines.push(`First user request: ${stringifyContent(firstUser.content).slice(0, 500)}`);
  }
  const last = t.turns.slice(-5);
  for (const x of last) {
    lines.push('---');
    lines.push(`[${x.type}] ${stringifyContent(x.content).slice(0, 400)}`);
  }
  return lines.join('\n');
}

// Haiku gate. Returns { pass, reason }. Fail-open on network/HTTP errors.
async function llmGate(t, opts) {
  const apiKey = (opts && opts.apiKey) || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { pass: true, reason: 'no_api_key_skip_gate' };
  const model = (opts && opts.model) || process.env.CLAUDE_DISTILL_GATE_MODEL || 'claude-haiku-4-5-20251001';

  const sample = buildGateSample(t);
  const prompt = [
    'Below is the tail of a developer coding session with Claude Code.',
    'Does it contain a non-trivial lesson, gotcha, judgment call, or insight worth recording for future sessions?',
    'Skip routine work, simple Q&A, and trivial fixes.',
    'Reply with exactly "yes" or "no" — nothing else.',
    '',
    sample,
  ].join('\n');

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (e) {
    return { pass: true, reason: 'gate_network_error' };
  }
  if (!res.ok) return { pass: true, reason: 'gate_http_' + res.status };
  let data;
  try { data = await res.json(); } catch { return { pass: true, reason: 'gate_bad_json' }; }
  const block = (data.content || []).find((c) => c.type === 'text');
  const text = ((block && block.text) || '').toLowerCase().trim();
  return { pass: text.startsWith('y'), reason: 'haiku:' + (text || 'empty').slice(0, 16) };
}

module.exports = { heuristicGate, llmGate, MIN_TURNS };
