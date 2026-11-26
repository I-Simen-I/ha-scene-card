import { ButtonConfig, HassEntity } from "./types";

// Entities the editor suggests. Any entity works in YAML; a button is
// active when its entity is `on`.
export const BUTTON_DOMAINS = [
  "input_boolean",
  "switch",
  "light",
  "fan",
  "group",
  "automation",
  "binary_sensor",
];

// An entity id is short for { entity: <id> }
export const toButton = (button: ButtonConfig | string): ButtonConfig =>
  typeof button === "string" ? { entity: button } : button;

// Like Home Assistant's own template detection, so plain text needs no
// round trip to the server
export const isTemplate = (text?: string): text is string =>
  !!text && /\{[{%#]/.test(text);

export const buttonName = (
  button: ButtonConfig,
  stateObj?: HassEntity,
): string =>
  button.name || stateObj?.attributes.friendly_name || button.entity || "";
