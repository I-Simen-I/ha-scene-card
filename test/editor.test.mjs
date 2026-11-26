// Smoke tests of the visual editor, loaded from the built bundle.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  setupDom,
  createEditor,
  collectConfigs,
  editorForms,
  changeForm,
} from "./helpers.mjs";

setupDom();

const CONFIG = {
  type: "custom:ha-scene-card",
  buttons: [{ entity: "input_boolean.morning" }, "switch.movie"],
};

const buttonForms = (editor) => editorForms(editor).slice(1);

test("shows a panel per button, titled by its name", async () => {
  const editor = await createEditor(CONFIG);
  const headers = [
    ...editor.shadowRoot.querySelectorAll('[slot="header"]'),
  ].map((el) => el.textContent.trim());
  assert.deepEqual(headers, ["Morning", "Movie"]);
  assert.deepEqual(buttonForms(editor)[1].data, { entity: "switch.movie" });
  editor.remove();
});

test("only stores the fields a user set", async () => {
  const editor = await createEditor(CONFIG);
  const configs = collectConfigs(editor);
  const form = buttonForms(editor)[0];

  changeForm(form, { ...form.data, name: "Wake up", icon: "" });
  assert.deepEqual(configs.at(-1).buttons[0], {
    entity: "input_boolean.morning",
    name: "Wake up",
  });
  assert.deepEqual(configs.at(-1).buttons[1], { entity: "switch.movie" });
  assert.equal(configs.at(-1).type, "custom:ha-scene-card");

  // Clearing a field removes it again
  changeForm(form, { entity: "input_boolean.morning", name: "" });
  assert.deepEqual(configs.at(-1).buttons[0], {
    entity: "input_boolean.morning",
  });
  editor.remove();
});

test("sets and clears the card's color", async () => {
  const editor = await createEditor(CONFIG);
  const configs = collectConfigs(editor);
  const [form] = editorForms(editor);
  changeForm(form, { ...form.data, color: "orange" });
  assert.equal(configs.at(-1).color, "orange");
  changeForm(form, { ...configs.at(-1), color: "" });
  assert.equal("color" in configs.at(-1), false);
  editor.remove();
});

test("adds, moves and removes buttons", async () => {
  const editor = await createEditor({ buttons: [] });
  const configs = collectConfigs(editor);
  const picker = editor.shadowRoot.querySelector("ha-entity-picker");
  for (const entity of [
    "switch.movie",
    "input_boolean.night",
    "input_boolean.morning",
  ]) {
    picker.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: entity } }),
    );
  }
  await editor.updateComplete;
  assert.deepEqual(
    configs.at(-1).buttons.map((b) => b.entity),
    ["switch.movie", "input_boolean.night", "input_boolean.morning"],
  );
  assert.equal(picker.value, "");

  // Dragging a button fires item-moved on ha-sortable
  editor.shadowRoot
    .querySelector("ha-sortable")
    .dispatchEvent(
      new CustomEvent("item-moved", { detail: { oldIndex: 2, newIndex: 0 } }),
    );
  await editor.updateComplete;
  assert.deepEqual(
    configs.at(-1).buttons.map((b) => b.entity),
    ["input_boolean.morning", "switch.movie", "input_boolean.night"],
  );

  editor.shadowRoot.querySelectorAll(".remove")[1].click();
  await editor.updateComplete;
  assert.deepEqual(
    configs.at(-1).buttons.map((b) => b.entity),
    ["input_boolean.morning", "input_boolean.night"],
  );
  editor.remove();
});

test("uses Home Assistant's translations", async () => {
  const editor = await createEditor(CONFIG);
  const [cardForm, buttonForm] = editorForms(editor);
  const generic = "ui.panel.lovelace.editor.card.generic.";
  for (const name of ["title", "color"]) {
    assert.equal(cardForm.computeLabel({ name }), generic + name);
  }
  assert.equal(
    cardForm.computeLabel({ name: "center_title" }),
    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.center",
  );
  for (const { name } of buttonForm.schema.filter(
    (field) => field.name !== "secondary",
  )) {
    assert.equal(buttonForm.computeLabel({ name }), generic + name);
  }
  assert.equal(
    buttonForm.computeLabel({ name: "secondary" }),
    "ui.panel.lovelace.editor.card.entity-row.secondary_info",
  );
  assert.equal(
    editor.shadowRoot.querySelector("ha-entity-picker").label,
    "ui.panel.lovelace.editor.entities.add",
  );
  assert.equal(
    editor.shadowRoot.querySelector(".remove").label,
    "ui.common.remove",
  );
  editor.remove();
});

test("editor keeps its schemas between renders", async () => {
  const editor = await createEditor(CONFIG);
  const before = editorForms(editor).map((f) => f.schema);
  editor.setConfig({ ...CONFIG, color: "red" });
  await editor.updateComplete;
  const after = editorForms(editor).map((f) => f.schema);
  assert.equal(after.length, before.length);
  after.forEach((schema, i) => assert.equal(schema, before[i]));
  editor.remove();
});

test("sets the title and only stores center_title when on", async () => {
  const editor = await createEditor(CONFIG);
  const configs = collectConfigs(editor);
  const [form] = editorForms(editor);

  changeForm(form, { ...form.data, title: "Scenes", center_title: true });
  assert.equal(configs.at(-1).title, "Scenes");
  assert.equal(configs.at(-1).center_title, true);
  assert.deepEqual(configs.at(-1).buttons, CONFIG.buttons);

  changeForm(form, { ...configs.at(-1), title: "", center_title: false });
  assert.equal("title" in configs.at(-1), false);
  assert.equal("center_title" in configs.at(-1), false);
  editor.remove();
});

test("shows names by default and only stores show_name when off", async () => {
  const editor = await createEditor(CONFIG);
  const configs = collectConfigs(editor);
  const [form] = editorForms(editor);
  assert.equal(form.data.show_name, true);
  assert.equal(
    form.computeLabel({ name: "show_name" }),
    "ui.panel.lovelace.editor.card.generic.show_name",
  );

  changeForm(form, { ...form.data, show_name: false });
  assert.equal(configs.at(-1).show_name, false);

  changeForm(form, { ...form.data, show_name: true });
  assert.equal("show_name" in configs.at(-1), false);
  editor.remove();
});
