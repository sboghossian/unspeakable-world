/**
 * Unit coverage for the Cosmic Copilot system-prompt builder.
 *
 * The whole pitch of the Copilot is grounded answers — if the prompt
 * silently drops the focused object or the camera pointing the model
 * starts hallucinating. We check (1) a fully-populated context renders
 * the object + RA/Dec + overlays, and (2) an empty/anonymous context
 * still produces a coherent prompt without crashing on missing fields.
 */

import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "../../src/viewer/copilot/context-builder";
import type { SceneContext } from "../../src/viewer/copilot/types";

describe("buildSystemPrompt", () => {
  it("includes focused object, sexagesimal coords, and overlays (happy path)", () => {
    const ctx: SceneContext = {
      focusedObject: {
        name: "Andromeda Galaxy",
        type: "galaxy",
        raDeg: 10.6847,
        decDeg: 41.2687,
      },
      cameraRaDeg: 10.6847,
      cameraDecDeg: 41.2687,
      fovDeg: 5.5,
      overlays: ["Gaia DR3", "2MASS"],
      simTimeIso: "2025-01-01T00:00:00Z",
      observer: { lat: 48.85, lon: 2.35 },
    };
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Andromeda Galaxy");
    expect(prompt).toContain("type galaxy");
    expect(prompt).toMatch(/RA 00h42m/); // 10.6847° → ~00h42m
    expect(prompt).toMatch(/Dec \+41°/);
    expect(prompt).toContain("Gaia DR3, 2MASS");
    expect(prompt).toContain("lat 48.85°");
  });

  it("handles a no-focus / no-observer / no-overlay context (edge case)", () => {
    const ctx: SceneContext = {
      focusedObject: null,
      cameraRaDeg: 0,
      cameraDecDeg: 0,
      fovDeg: 60,
      overlays: [],
      simTimeIso: "2025-01-01T00:00:00Z",
      observer: null,
    };
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Focused object: (none");
    expect(prompt).toContain("Active overlays: none");
    expect(prompt).toContain("Observer location: not shared");
  });
});
