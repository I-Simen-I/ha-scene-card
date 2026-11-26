import { ActionConfig, ButtonConfig } from "./types";

export type ActionType = "tap" | "hold" | "double_tap";

export const fireEvent = (
  node: EventTarget,
  type: string,
  detail?: unknown,
): void => {
  node.dispatchEvent(
    new CustomEvent(type, { bubbles: true, composed: true, detail }),
  );
};

export const hasAction = (action?: ActionConfig): boolean =>
  action !== undefined && action.action !== "none";

// Hand the action over to Home Assistant, so every action type the
// action editor offers (toggle, perform-action, navigate, ...) works.
// HA reads `entity` and `<action>_action` from the config.
export const fireAction = (
  node: Element,
  config: ButtonConfig,
  action: ActionType,
): void => {
  const key = `${action}_action` as const;
  const actionConfig = config[key];
  // Older configs may use `perform_action`, which Home Assistant doesn't know
  const normalized =
    actionConfig?.action === "perform_action"
      ? { ...actionConfig, action: "perform-action" }
      : actionConfig;
  fireEvent(node, "hass-action", {
    config: { ...config, [key]: normalized },
    action,
  });
};
