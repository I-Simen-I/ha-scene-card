// Smoke tests of the card, loaded from the built bundle.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  setupDom,
  infoLogs,
  entity,
  STATES,
  createHass,
  createCard,
  settle,
  buttonElements,
  buttons,
  names,
  icon,
  collectActions,
  wait,
  templates,
  activeTemplates,
} from "./helpers.mjs";

setupDom();

const BASIC = {
  buttons: [
    { entity: "input_boolean.morning" },
    { entity: "input_boolean.night" },
    { entity: "switch.movie" },
  ],
};

const BASIC_NAMES = ["Morning", "Night", "Movie"];

test("registers the card and the editor", async () => {
  const Card = customElements.get("ha-scene-card");
  assert.ok(Card, "ha-scene-card is not defined");
  assert.ok(
    window.customCards.some((c) => c.type === "ha-scene-card"),
    "card is not added to window.customCards",
  );
  const editor = await Card.getConfigElement();
  assert.equal(editor.tagName.toLowerCase(), "ha-scene-card-editor");
  assert.ok(infoLogs.some((log) => log.includes("HA Scene Card")));
});

test("renders a button per entry, in order", async () => {
  const card = await createCard(BASIC);
  assert.ok(card.shadowRoot.querySelector("ha-card"));
  assert.deepEqual(names(card), ["Morning", "Night", "Movie"]);
  card.remove();
});

test("accepts entity ids as short buttons", async () => {
  const card = await createCard({
    buttons: ["input_boolean.morning", { entity: "switch.movie" }],
  });
  assert.deepEqual(names(card), ["Morning", "Movie"]);
  card.remove();
});

test("renders nothing without buttons", async () => {
  for (const config of [{}, { buttons: [] }]) {
    const card = await createCard(config);
    assert.equal(card.shadowRoot.querySelector("ha-card"), null);
    assert.equal(card.getCardSize(), 0);
    card.remove();
  }
});

test("rejects invalid button lists", () => {
  const card = document.createElement("ha-scene-card");
  assert.throws(() => card.setConfig({ buttons: "switch.movie" }), /list/);
  assert.throws(() => card.setConfig({ buttons: [null] }), /entity id/);
});

test("marks buttons whose entity is on as active", async () => {
  const card = await createCard(BASIC);
  assert.deepEqual(
    buttons(card).map((b) => b.hasAttribute("active")),
    [false, true, false],
  );
  assert.deepEqual(
    buttons(card).map((b) => b.getAttribute("aria-pressed")),
    ["false", "true", "false"],
  );
  card.remove();
});

test("follows state changes", async () => {
  const card = await createCard(BASIC);
  card.hass = createHass({
    "input_boolean.morning": entity("input_boolean.morning", "on", {
      friendly_name: "Morning",
    }),
    "input_boolean.night": entity("input_boolean.night", "off", {
      friendly_name: "Night",
    }),
  });
  await settle(card);
  assert.deepEqual(
    buttons(card).map((b) => b.hasAttribute("active")),
    [true, false, false],
  );
  card.remove();
});

test("only re-renders buttons whose entity changed", async () => {
  const card = await createCard(BASIC);
  const [morning, night] = buttonElements(card);
  const before = night.stateObj;
  card.hass = createHass({
    "input_boolean.morning": entity("input_boolean.morning", "on"),
    "sensor.temperature": entity("sensor.temperature", "22"),
  });
  await settle(card);
  assert.equal(night.stateObj, before);
  assert.equal(morning.stateObj.state, "on");

  // A change to another entity alone doesn't render the card again
  const hass = createHass({
    "input_boolean.morning": morning.stateObj,
  });
  card.hass = hass;
  assert.equal(card.isUpdatePending, false);
  card.hass = { ...hass, states: { ...hass.states, "sensor.x": {} } };
  assert.equal(card.isUpdatePending, false);
  card.remove();
});

test("overrides name and icon", async () => {
  const card = await createCard({
    buttons: [
      { entity: "input_boolean.morning", name: "Wake up", icon: "mdi:sun" },
      { entity: "input_boolean.night" },
    ],
  });
  assert.deepEqual(names(card), ["Wake up", "Night"]);
  const [morning, night] = buttons(card);
  assert.equal(icon(morning).icon, "mdi:sun");
  assert.equal(icon(morning).stateObj, STATES["input_boolean.morning"]);
  // Without an override, ha-state-icon shows the entity's own icon
  assert.equal(icon(night).icon, undefined);
  assert.equal(icon(night).stateObj, STATES["input_boolean.night"]);
  card.remove();
});

test("uses the primary color, the card's color or the button's color", async () => {
  const color = (button) => button.style.getPropertyValue("--scene-color");

  let card = await createCard(BASIC);
  assert.equal(color(buttons(card)[0]), "var(--primary-color)");
  card.remove();

  card = await createCard({
    color: "orange",
    buttons: [
      { entity: "input_boolean.morning" },
      { entity: "input_boolean.night", color: "#ff0000" },
      { entity: "switch.movie", color: "deep-purple" },
    ],
  });
  assert.deepEqual(buttons(card).map(color), [
    "var(--orange-color)",
    "#ff0000",
    "var(--deep-purple-color)",
  ]);
  card.remove();
});

test("shows missing entities greyed out and not clickable", async () => {
  const { events, stop } = collectActions();
  const card = await createCard({
    buttons: [{ entity: "input_boolean.gone" }, { name: "No entity" }],
  });
  assert.deepEqual(names(card), ["input_boolean.gone", "No entity"]);
  for (const button of buttons(card)) {
    assert.ok(button.hasAttribute("unavailable"));
    assert.equal(button.getAttribute("role"), null);
    assert.equal(button.getAttribute("tabindex"), null);
    assert.equal(icon(button).tagName.toLowerCase(), "ha-icon");
    assert.equal(icon(button).icon, "mdi:help-circle-outline");
    button.click();
  }
  assert.equal(events.length, 0);
  stop();
  card.remove();
});

test("shows unavailable entities greyed out", async () => {
  const card = await createCard({ buttons: [{ entity: "light.kitchen" }] });
  const [button] = buttons(card);
  assert.ok(button.hasAttribute("unavailable"));
  assert.equal(button.getAttribute("role"), "button");
  card.remove();
});

test("toggles the entity on tap", async () => {
  const { events, stop } = collectActions();
  const card = await createCard(BASIC);
  const [morning] = buttons(card);
  assert.equal(morning.getAttribute("role"), "button");
  assert.equal(morning.getAttribute("tabindex"), "0");
  morning.click();
  assert.equal(events.length, 1);
  assert.equal(events[0].action, "tap");
  assert.equal(events[0].config.entity, "input_boolean.morning");
  assert.deepEqual(events[0].config.tap_action, { action: "toggle" });
  stop();
  card.remove();
});

test("supports Enter and Space", async () => {
  const { events, stop } = collectActions();
  const card = await createCard(BASIC);
  const [morning] = buttons(card);
  for (const key of ["Enter", " ", "a"]) {
    morning.dispatchEvent(new KeyboardEvent("keydown", { key }));
  }
  assert.equal(events.length, 2);
  stop();
  card.remove();
});

test("uses the button's own actions", async () => {
  const { events, stop } = collectActions();
  const card = await createCard({
    buttons: [
      {
        entity: "input_boolean.morning",
        tap_action: {
          action: "perform_action",
          perform_action: "scene.turn_on",
        },
        hold_action: { action: "more-info" },
      },
      { entity: "switch.movie", tap_action: { action: "none" } },
    ],
  });
  const [morning, movie] = buttons(card);

  morning.click();
  assert.equal(events.at(-1).config.tap_action.action, "perform-action");

  morning.dispatchEvent(new Event("pointerdown"));
  await wait(600);
  morning.dispatchEvent(new Event("pointerup"));
  morning.click();
  assert.equal(events.length, 2, "the click ending a hold is not a tap");
  assert.equal(events.at(-1).action, "hold");
  assert.deepEqual(events.at(-1).config.hold_action, { action: "more-info" });

  // No action means no button role
  assert.equal(movie.getAttribute("role"), null);
  assert.equal(movie.getAttribute("aria-pressed"), null);
  movie.click();
  assert.equal(events.length, 2);
  stop();
  card.remove();
});

test("suggests input_boolean and switch entities in the card picker", () => {
  const Card = customElements.get("ha-scene-card");
  assert.deepEqual(Card.getStubConfig(createHass()), {
    buttons: [
      { entity: "input_boolean.morning" },
      { entity: "input_boolean.night" },
      { entity: "switch.movie" },
    ],
  });
});

test("fills one dashboard column in sections", async () => {
  const card = await createCard(BASIC);
  assert.deepEqual(card.getGridOptions(), { columns: 12, min_columns: 3 });
  card.remove();
});

test("shows an optional title, left aligned or centered", async () => {
  const title = (card) => card.shadowRoot.querySelector(".title");

  let card = await createCard(BASIC);
  assert.equal(title(card), null);
  assert.equal(card.getCardSize(), 3);
  card.remove();

  card = await createCard({ ...BASIC, title: "Scenes" });
  assert.equal(title(card).textContent.trim(), "Scenes");
  assert.equal(title(card).hasAttribute("centered"), false);
  assert.equal(card.getCardSize(), 4);
  card.remove();

  card = await createCard({ ...BASIC, title: "Scenes", center_title: true });
  assert.ok(title(card).hasAttribute("centered"));
  card.remove();

  // A title alone still shows the card
  card = await createCard({ title: "Scenes" });
  assert.equal(title(card).textContent.trim(), "Scenes");
  card.remove();
});

test("tints the whole active button with its color", () => {
  const css = customElements
    .get("ha-scene-card-button")
    .elementStyles.map((s) => s.cssText)
    .join("");
  assert.match(css, /\.button\[active\]\s*\{[^}]*var\(--scene-color\)/);
});

test("hides the names with show_name: false", async () => {
  let card = await createCard(BASIC);
  assert.deepEqual(names(card), ["Morning", "Night", "Movie"]);
  assert.ok(
    [...buttonElements(card)].every((b) => !b.hasAttribute("hide-name")),
  );
  card.remove();

  card = await createCard({ ...BASIC, show_name: false });
  for (const [i, el] of [...buttonElements(card)].entries()) {
    assert.ok(el.hasAttribute("hide-name"), "narrower without a name");
    const button = buttons(card)[i];
    assert.equal(button.querySelector(".name"), null);
    // Still named for screen readers and as a tooltip
    assert.equal(button.getAttribute("aria-label"), BASIC_NAMES[i]);
    assert.equal(button.getAttribute("title"), BASIC_NAMES[i]);
  }
  assert.equal(card.getCardSize(), 2);
  card.remove();
});

test("gives every button the width of the widest name", async () => {
  const card = await createCard({
    buttons: [
      ...BASIC.buttons,
      { entity: "light.kitchen", name: "A scene with a long name" },
    ],
  });
  const all = [...BASIC_NAMES, "A scene with a long name"];
  for (const [i, button] of buttons(card).entries()) {
    const sizers = [...button.querySelectorAll(".sizer")];
    assert.deepEqual(
      sizers.map((s) => s.textContent),
      all,
    );
    assert.ok(sizers.every((s) => s.getAttribute("aria-hidden") === "true"));
    assert.equal(button.querySelector(".name").textContent, all[i]);
  }

  // The list is kept while the names don't change, so a state change only
  // gives the button of that entity new properties
  const [first] = buttonElements(card);
  const before = first.labels;
  card.hass = createHass({
    "input_boolean.night": entity("input_boolean.night", "off", {
      friendly_name: "Night",
    }),
  });
  await settle(card);
  assert.equal(buttons(card)[1].hasAttribute("active"), false);
  assert.equal(first.labels, before);
  card.remove();
});

const secondaries = (card) =>
  buttons(card).map((b) => b.querySelector(".secondary")?.textContent ?? null);

test("shows a secondary text", async () => {
  templates.length = 0;
  const card = await createCard({
    buttons: [
      { entity: "input_boolean.morning", secondary: "07:00" },
      { entity: "input_boolean.night" },
    ],
  });
  assert.deepEqual(secondaries(card), ["07:00", null]);
  assert.equal(buttons(card)[0].getAttribute("title"), "Morning, 07:00");
  // Plain text needs no template rendering
  assert.equal(templates.length, 0);
  // Secondary texts also set the shared width
  const sizers = [...buttons(card)[1].querySelectorAll(".sizer")];
  assert.ok(sizers.some((s) => s.textContent === "07:00"));
  card.remove();
});

test("renders templates in name and secondary", async () => {
  templates.length = 0;
  const name = "{{ states('sensor.temperature') }}°";
  const secondary = "{% if is_state(entity, 'on') %}On{% endif %}";
  const card = await createCard({
    buttons: [{ entity: "input_boolean.morning", name, secondary }],
  });
  assert.deepEqual(
    templates.map((t) => t.msg),
    [name, secondary].map((template) => ({
      type: "render_template",
      template,
      variables: { entity: "input_boolean.morning" },
    })),
  );
  assert.deepEqual(names(card), [`[${name}]`]);
  assert.deepEqual(secondaries(card), [`[${secondary}]`]);

  // New results follow the entities the template uses
  templates[0].send("22°");
  await settle(card);
  assert.deepEqual(names(card), ["22°"]);

  // An empty result falls back to the entity's name
  templates[0].send("");
  await settle(card);
  assert.deepEqual(names(card), ["Morning"]);
  card.remove();
  await wait(0);
  assert.equal(activeTemplates().length, 0, "unsubscribes when removed");
});

test("subscribes again when the templates change", async () => {
  templates.length = 0;
  const card = await createCard({
    buttons: [{ entity: "switch.movie", secondary: "{{ 1 }}" }],
  });
  const [first] = templates;
  card.setConfig({
    buttons: [{ entity: "switch.movie", secondary: "{{ 2 }}" }],
  });
  await settle(card);
  assert.equal(first.active, false);
  assert.deepEqual(
    activeTemplates().map((t) => t.msg.template),
    ["{{ 2 }}"],
  );
  assert.deepEqual(secondaries(card), ["[{{ 2 }}]"]);

  // Moving the card resubscribes
  card.remove();
  document.body.appendChild(card);
  await settle(card);
  assert.equal(activeTemplates().length, 1);
  card.remove();
});
