// Shared helpers for the smoke tests: a fake DOM with the built bundle
// loaded, and a fake Home Assistant to render the card against.
import { readFileSync } from "node:fs";
import { after, before } from "node:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";

// What the card logs with console.info, like its version banner
export const infoLogs = [];

// Call at the top of every test file; each file runs in its own process.
export const setupDom = () => {
  before(() => {
    GlobalRegistrator.register({ url: "http://localhost:8123/" });
    console.info = (...args) => infoLogs.push(args.join(" "));
    const bundle = readFileSync(
      new URL("../dist/ha-scene-card.js", import.meta.url),
      "utf8",
    );
    new Function(bundle)();
  });

  after(async () => {
    await GlobalRegistrator.unregister();
  });
};

export const entity = (entity_id, state, attributes = {}) => ({
  entity_id,
  state,
  attributes,
});

export const STATES = {
  "input_boolean.morning": entity("input_boolean.morning", "off", {
    friendly_name: "Morning",
    icon: "mdi:weather-sunset-up",
  }),
  "input_boolean.night": entity("input_boolean.night", "on", {
    friendly_name: "Night",
  }),
  "switch.movie": entity("switch.movie", "off", { friendly_name: "Movie" }),
  "light.kitchen": entity("light.kitchen", "unavailable", {
    friendly_name: "Kitchen",
  }),
  "sensor.temperature": entity("sensor.temperature", "21"),
};

// localize returns the key, so tests can check which translation is used
// Template subscriptions. Each renders as "[<template>]" at first; call
// send() for a new result, like Home Assistant when an entity changes.
export const templates = [];

export const activeTemplates = () => templates.filter((t) => t.active);

export const createHass = (states = {}) => ({
  states: { ...STATES, ...states },
  localize: (key) => key,
  connection: {
    subscribeMessage: async (callback, msg) => {
      const sub = {
        msg,
        active: true,
        send: (result) => sub.active && callback({ result }),
      };
      templates.push(sub);
      setTimeout(() => sub.send(`[${msg.template}]`));
      return () => {
        sub.active = false;
      };
    },
  },
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createCard = async (config, hass = createHass()) => {
  const card = document.createElement("ha-scene-card");
  card.setConfig(config);
  card.hass = hass;
  document.body.appendChild(card);
  await settle(card);
  return card;
};

// Waits for the card and its buttons to render
export const settle = async (card) => {
  await tick();
  await card.updateComplete;
  await Promise.all([...buttonElements(card)].map((b) => b.updateComplete));
};

export const buttonElements = (card) =>
  card.shadowRoot.querySelectorAll("ha-scene-card-button");

// The inner element of each button, which carries its state and role
export const buttons = (card) =>
  [...buttonElements(card)].map((b) => b.shadowRoot.querySelector(".button"));

export const names = (card) =>
  buttons(card).map((b) => b.querySelector(".name").textContent.trim());

export const icon = (button) => button.querySelector("ha-state-icon, ha-icon");

export const collectActions = () => {
  const events = [];
  const listener = (ev) => events.push(ev.detail);
  document.addEventListener("hass-action", listener);
  return {
    events,
    stop: () => document.removeEventListener("hass-action", listener),
  };
};

export const createEditor = async (config) => {
  const editor = await customElements.get("ha-scene-card").getConfigElement();
  editor.hass = createHass();
  editor.setConfig(config);
  document.body.appendChild(editor);
  await editor.updateComplete;
  return editor;
};

export const collectConfigs = (editor) => {
  const configs = [];
  editor.addEventListener("config-changed", (ev) =>
    configs.push(ev.detail.config),
  );
  return configs;
};

export const editorForms = (editor) => [
  ...editor.shadowRoot.querySelectorAll("ha-form"),
];

export const changeForm = (form, value) =>
  form.dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));
