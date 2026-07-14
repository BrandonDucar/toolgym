# Contributing

ToolGym welcomes narrowly scoped improvements to exercise quality, evaluator determinism, evidence portability, security, accessibility, and adapter interoperability.

## Ground Rules

1. Never add answer keys to a public API response or client bundle.
2. A workout must be deterministic, versioned, and covered by tests.
3. Critical safety failures must not be averaged away by unrelated scores.
4. Do not add arbitrary server-side URL fetching or provider-key storage.
5. New credentials must state exactly what was observed and who evaluated it.
6. Do not call a badge or credential standards-conformant without conformance evidence.

## Pull Requests

Run:

```bash
npm test
npm run lint
npm audit --omit=dev
```

Describe any schema, rubric, scoring, signing, expiry, or privacy changes in the pull request.
