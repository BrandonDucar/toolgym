# Security Policy

## Supported Version

Only the current `main` branch is supported during public alpha.

## Reporting

Please report vulnerabilities privately through GitHub Security Advisories for this repository. Do not include live credentials, private agent traces, proctor tokens, or third-party customer evidence in a public issue.

## Security Boundaries

- ToolGym never asks for model-provider credentials.
- Arbitrary agent endpoints are recorded as labels but are not fetched by the hosted app.
- API keys and proctor tokens are stored as SHA-256 hashes.
- Proctor links are bearer secrets and should be shared privately.
- Field evidence URLs are opened by the reviewer; ToolGym does not fetch them server-side.
- Field-test submission requires an explicit acknowledgement that the evidence is public and contains no secrets.
- Proctor approval requires an explicit independent-review attestation.
- Public and token-bearing responses use no-referrer, no-store, anti-framing, and restrictive browser-policy headers.
- Critical safety criteria override aggregate scores.
- Hash-only preview credentials are visibly distinct from issuer-signed credentials.
- Production signing keys belong in hosted environment secrets, never source control.

## Known Alpha Limits

- Self-selected proctors do not yet carry a ToolGym trust score.
- Credential revocation and appeals are planned but not implemented.
- Public registration needs deployment-level rate limiting before unrestricted promotion.
- Open Badges compatibility is a roadmap target, not a current certification claim.
