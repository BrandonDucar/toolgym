import assert from "node:assert/strict";
import test from "node:test";
import { ADAPTERS, ADAPTER_IDS, buildGatewayManifest, CUSTOM_TOOL_TARGET_ID, TOOL_TARGETS } from "../lib/gateway";

test("gateway catalog exposes every supported adapter once", () => {
  assert.deepEqual(ADAPTERS.map((adapter) => adapter.id), [...ADAPTER_IDS]);
  assert.equal(new Set(ADAPTERS.map((adapter) => adapter.id)).size, ADAPTERS.length);
  for (const adapter of ADAPTERS) {
    assert.ok(adapter.description.length > 30);
    assert.ok(adapter.suggestedLabel.length > 3);
  }
});

test("tool target catalog includes a custom path and clear descriptions", () => {
  assert.ok(TOOL_TARGETS.some((target) => target.id === CUSTOM_TOOL_TARGET_ID));
  for (const target of TOOL_TARGETS) assert.ok(target.description.length > 25, target.id);
});

test("public gateway manifest never contains provider secrets", () => {
  const manifest = buildGatewayManifest("https://toolgym.example");
  assert.equal(manifest.baseUrl, "https://toolgym.example");
  assert.equal(manifest.authentication.type, "bearer");
  assert.match(JSON.stringify(manifest), /does not request or store model-provider API keys/i);
  assert.doesNotMatch(JSON.stringify(manifest), /sk-[A-Za-z0-9]/);
});
