/**
 * Tool-calling schemas for the Cosmic Copilot.
 *
 * These are passed to backends that support OpenAI-style tool-calling
 * (currently: Cloudflare Workers AI's `@cf/meta/llama-3.1-8b-instruct`
 * binding when wired through `env.AI.run({ messages, tools })`). The
 * model decides — given a user question and the live scene context —
 * whether to call zero, one, or several of these to act on the viewer
 * before composing its prose answer.
 *
 * Format: OpenAI `tools` array shape, each entry `{ type: "function",
 * function: { name, description, parameters: JSONSchema } }`. We keep the
 * schemas conservative (additionalProperties: false, required-fields
 * explicit) so a small 8B model has the best chance of emitting valid
 * tool JSON on the first try.
 *
 * Adding a new tool: declare it here, add a runner case in
 * `tool-runner.ts`, and surface a `CopilotHost` method for it. The
 * panel renders any tool call generically — no UI change needed unless
 * you want a custom icon.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Subset of JSON Schema we use. Kept loose because tool param shapes vary. */
export type JsonSchema = {
  type: "object";
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
};

/** Names every tool the Copilot is allowed to invoke. Used as a discriminator. */
export type ToolName =
  | "fly_to"
  | "enable_layer"
  | "disable_layer"
  | "set_time"
  | "set_overlay"
  | "take_snapshot"
  | "set_mode";

/** A model-emitted call: tool name + already-parsed argument object. */
export type ToolCall = {
  /** Vendor-specific id (Cloudflare/OpenAI echo this back so we can pair results). */
  id?: string;
  name: ToolName;
  args: Record<string, unknown>;
};

/**
 * Known HiPS survey ids we expose for `set_overlay`. Kept in lock-step
 * with the WavelengthBar choices; if the user adds a new survey there,
 * mirror it here so the model knows the enum.
 */
export const KNOWN_OVERLAYS = [
  "dss2",
  "2mass",
  "allwise",
  "integral",
  "planck",
  "halpha",
] as const;

/**
 * Known modes the viewer can switch between (matches the hash-router's
 * `Route` enum for scene-changing routes).
 */
export const KNOWN_MODES = ["sky", "solar", "galactic", "universe"] as const;

/**
 * Known extra-layer ids the Copilot can toggle. Mirror of the
 * `EXTRA_LAYERS` registry — duplicated as a literal here so the model
 * sees a concrete enum instead of an open string.
 */
export const KNOWN_LAYERS = [
  "gaia-stars",
  "exoplanets-full",
  "chandra",
  "variables",
  "multimessenger",
  "ztf-alerts",
  "planck-polarization",
  "sky-cultures-extended",
  "galaxy-cone",
  "cosmicflows4",
  "neocp-risk",
  "starlink-optin",
  "globe-at-night",
  "opal-giants",
  "mars-rover-iotd",
] as const;

export const TOOLS: ReadonlyArray<ToolDef> = [
  {
    type: "function",
    function: {
      name: "fly_to",
      description:
        "Move the camera to a named celestial target — a planet (Sun, Moon, Mercury…Neptune, ISS), Messier/NGC object (M31, NGC 1234), or any SIMBAD-resolvable name (Sirius, Sgr A*, Crab Nebula). Use this whenever the user asks to 'go to', 'show me', 'fly to', or 'look at' something.",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description:
              "Name of the target. Examples: 'M31', 'Andromeda Galaxy', 'Mars', 'Sirius', 'Sgr A*'.",
          },
        },
        required: ["target"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enable_layer",
      description:
        "Turn on one of the extra federated data layers (Gaia DR3 stars, Chandra X-ray, exoplanets, multi-messenger, Starlink, etc.). Use when the user asks to 'show', 'enable', 'turn on', or 'add' a layer.",
      parameters: {
        type: "object",
        properties: {
          layer_id: {
            type: "string",
            enum: [...KNOWN_LAYERS],
            description: "Identifier of the layer to enable.",
          },
        },
        required: ["layer_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "disable_layer",
      description:
        "Turn off one of the extra federated data layers. Use when the user asks to 'hide', 'disable', 'turn off', or 'remove' a layer.",
      parameters: {
        type: "object",
        properties: {
          layer_id: {
            type: "string",
            enum: [...KNOWN_LAYERS],
            description: "Identifier of the layer to disable.",
          },
        },
        required: ["layer_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_time",
      description:
        "Set the simulation clock to a specific moment. Use when the user mentions a date, a time, 'rewind to', 'fast-forward to', or wants to see the sky at a particular event (eclipse, conjunction, perihelion).",
      parameters: {
        type: "object",
        properties: {
          iso: {
            type: "string",
            description:
              "ISO-8601 timestamp, e.g. '2024-04-08T18:18:00Z' for the 2024 total solar eclipse over North America.",
          },
        },
        required: ["iso"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_overlay",
      description:
        "Switch the HiPS background overlay to a different wavelength (infrared, X-ray, gamma, Planck CMB, H-alpha). Use when the user asks to see the sky in a particular wavelength or via a specific survey.",
      parameters: {
        type: "object",
        properties: {
          survey_id: {
            type: "string",
            enum: [...KNOWN_OVERLAYS, "none"],
            description:
              "Survey id. 'none' (or omit) restores the default DSS2 visible-light view.",
          },
        },
        required: ["survey_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "take_snapshot",
      description:
        "Capture the current view as a PNG and offer it to the user. Use when the user asks for a 'screenshot', 'picture', 'snapshot', or 'save this view'.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_mode",
      description:
        "Switch the viewer scene mode. 'sky' is the all-sky planetarium, 'solar' is the 3D Solar System flight, 'galactic' is Milky Way structure, 'universe' is the cosmic-web at large scale.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: [...KNOWN_MODES],
            description: "Target scene mode.",
          },
        },
        required: ["mode"],
        additionalProperties: false,
      },
    },
  },
];

/**
 * Parse one tool call from the various shapes Cloudflare / OpenAI emit.
 * Returns null if the payload doesn't look like a valid tool call we know
 * about — caller treats this as plain text.
 *
 * We accept:
 *  - OpenAI `tool_calls[i] = { id, type:"function", function:{ name, arguments:"json-string" } }`
 *  - Legacy `function_call = { name, arguments:"json-string" }`
 *  - Cloudflare's looser `{ name, arguments: object | string }`
 */
export function parseToolCall(payload: unknown): ToolCall | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  // OpenAI tool_calls[i] shape
  const fn = (p as { function?: unknown }).function;
  if (fn && typeof fn === "object") {
    const f = fn as Record<string, unknown>;
    const name = typeof f.name === "string" ? f.name : null;
    if (!name || !isKnownTool(name)) return null;
    const args = coerceArgs(f.arguments);
    if (!args) return null;
    return {
      ...(typeof p.id === "string" ? { id: p.id } : {}),
      name,
      args,
    };
  }

  // Flat `{ name, arguments }` shape
  const flatName = typeof p.name === "string" ? p.name : null;
  if (flatName && isKnownTool(flatName)) {
    const args = coerceArgs(p.arguments ?? p.args);
    if (!args) return null;
    return { name: flatName, args };
  }

  return null;
}

function isKnownTool(name: string): name is ToolName {
  return (
    name === "fly_to" ||
    name === "enable_layer" ||
    name === "disable_layer" ||
    name === "set_time" ||
    name === "set_overlay" ||
    name === "take_snapshot" ||
    name === "set_mode"
  );
}

function coerceArgs(raw: unknown): Record<string, unknown> | null {
  if (raw === undefined || raw === null) return {};
  if (typeof raw === "string") {
    if (raw.trim() === "") return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
}
