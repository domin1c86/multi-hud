/**
 * Routing-layer detection.
 *
 * When Claude Code talks to a proxy/router (claude-code-router, LiteLLM, one-api, …) the
 * `model.id` on the statusline event is only the *requested* alias, not the model that
 * actually served the request. `ANTHROPIC_BASE_URL` (inherited from Claude Code's env) tells
 * us routing is active; the transcript's `message.model` tells us what actually answered.
 */

/** Hostname of the canonical Anthropic API — any other host means a routing layer is in play. */
const ANTHROPIC_HOST = 'api.anthropic.com';

/**
 * True when `ANTHROPIC_BASE_URL` is set to a non-Anthropic host, i.e. requests are routed
 * through a proxy. Returns false when unset, empty, pointing at Anthropic, or unparseable.
 */
export function isRoutedBaseUrl(baseUrl: string | undefined): boolean {
  if (!baseUrl) return false;
  try {
    return new URL(baseUrl).hostname !== ANTHROPIC_HOST;
  } catch {
    return false;
  }
}

export interface ActiveModel {
  /** The model id to use for detection/cost/display. */
  modelId: string;
  /** The id Claude Code requested (the router alias, when routed). */
  requestedId: string;
  /** True when routing is active and a distinct backend model is being surfaced. */
  routed: boolean;
}

/**
 * Resolve which model the HUD should treat as active. Only when `routed` do we prefer the
 * transcript-reported model over the requested id — this keeps non-routed behaviour identical
 * to before and avoids flagging cosmetic version differences as routing.
 */
export function resolveActiveModel(params: {
  requestedId: string;
  transcriptModel: string | null;
  routed: boolean;
}): ActiveModel {
  const { requestedId, transcriptModel, routed } = params;
  const modelId = routed && transcriptModel ? transcriptModel : requestedId;
  return { modelId, requestedId, routed: routed && !!transcriptModel };
}
