# Standards and Evaluation References

## Model Context Protocol

The MCP authorization specification defines transport-level authorization and explicitly rejects token passthrough. Future ToolGym MCP support will use audience-bound credentials, scoped tools, and no provider-key relay.

- [MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)

## Agent traces

The OpenAI Agents SDK traces model generations, tool calls, handoffs, guardrails, and custom events. It also warns that trace payloads may contain sensitive data. ToolGym will ingest only an explicit, redacted evidence envelope rather than treating an entire provider trace as public proof.

- [OpenAI Agents SDK tracing](https://openai.github.io/openai-agents-js/guides/tracing/)

## Browser evaluation

BrowserGym provides an extensible environment across browser-agent benchmarks and clearly identifies itself as a research framework rather than a consumer product. ToolGym can provide a consumer-facing qualification and credential layer around isolated BrowserGym runs without copying its benchmark implementation.

- [ServiceNow BrowserGym](https://github.com/ServiceNow/BrowserGym)

## Portable credentials

W3C Verifiable Credentials 2.0 defines the base data model for issuer claims. Open Badges 3.0 aligns achievement credentials with that model and can carry criteria and evidence.

- [W3C Verifiable Credentials overview](https://www.w3.org/TR/vc-overview/)
- [1EdTech Open Badges](https://www.1edtech.org/standards/open-badges)
- [Open Badges 3.0 specification](https://www.imsglobal.org/spec/ob/v3p0)

The current ToolGym credential is intentionally labeled `AgentToolMasteryCredential`. It is signed and portable, but it must not be described as Open Badges 3.0 conformant until a complete export profile and conformance tests are implemented.
