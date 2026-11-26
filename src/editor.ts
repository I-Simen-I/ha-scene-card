import { LitElement, html, TemplateResult, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { fireEvent } from "./actions";
import { BUTTON_DOMAINS, buttonName, toButton } from "./config";
import { ButtonConfig, CardConfig, HomeAssistant } from "./types";

const CARD_SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "center_title", selector: { boolean: {} } },
  { name: "show_name", selector: { boolean: {} } },
  { name: "color", selector: { ui_color: {} } },
];

// Card options that aren't off by default. ha-form shows them with these
// values, and they're left out of the config while they have them.
const CARD_DEFAULTS = { show_name: true };

const BUTTON_SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: BUTTON_DOMAINS } },
  },
  // Text or a template, like {{ states('sensor.temperature') }}
  { name: "name", selector: { text: {} } },
  { name: "secondary", selector: { text: {} } },
  // Shows the entity's own icon as placeholder
  { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
  { name: "color", selector: { ui_color: {} } },
  { name: "tap_action", selector: { ui_action: { default_action: "toggle" } } },
  { name: "hold_action", selector: { ui_action: { default_action: "none" } } },
  {
    name: "double_tap_action",
    selector: { ui_action: { default_action: "none" } },
  },
];

// Labels come from Home Assistant's own translations, so the editor
// speaks every language HA does. The lovelace editor strings are loaded
// while a card editor is open.
const GENERIC_LABEL = "ui.panel.lovelace.editor.card.generic.";
const LABELS: Record<string, string> = {
  secondary: "ui.panel.lovelace.editor.card.entity-row.secondary_info",
  center_title:
    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.center",
};

// ha-form sends every field, cleared text as "" and switched off booleans
// as false. Leave those and other defaults out, so the config only holds
// what the user set.
const compact = <T extends object>(
  value: T,
  defaults: Record<string, unknown> = {},
): T =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([key, v]) =>
        v !== undefined &&
        v !== "" &&
        v !== (key in defaults ? defaults[key] : false),
    ),
  ) as T;

@customElement("ha-scene-card-editor")
export class HaSceneCardEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: CardConfig;

  static styles = css`
    .buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }
    .button-row {
      display: flex;
      align-items: flex-start;
      gap: 4px;
    }
    .handle {
      display: flex;
      align-items: center;
      height: 48px;
      padding-right: 4px;
      cursor: move;
      color: var(--secondary-text-color);
    }
    ha-expansion-panel {
      flex: 1;
      min-width: 0;
    }
    .button-content {
      padding: 8px 16px 16px;
    }
    ha-entity-picker {
      display: block;
      margin-top: 8px;
    }
  `;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  private get _buttons(): ButtonConfig[] {
    return (this._config?.buttons ?? []).map(toButton);
  }

  private _computeLabel = (schema: { name: string }): string =>
    this.hass.localize(LABELS[schema.name] ?? GENERIC_LABEL + schema.name);

  private _fireConfig(config: CardConfig): void {
    this._config = config;
    fireEvent(this, "config-changed", { config });
  }

  private _setButtons(buttons: ButtonConfig[]): void {
    this._fireConfig({ ...this._config, buttons });
  }

  private _cardChanged(ev: CustomEvent): void {
    this._fireConfig(
      compact({ ...this._config, ...ev.detail.value }, CARD_DEFAULTS),
    );
  }

  private _buttonChanged(index: number, ev: CustomEvent): void {
    const buttons = [...this._buttons];
    buttons[index] = compact(ev.detail.value as ButtonConfig);
    this._setButtons(buttons);
  }

  private _addButton(ev: CustomEvent): void {
    const entity = ev.detail.value as string | undefined;
    if (!entity) return;
    // Clear the picker so the next button can be picked
    (ev.target as HTMLElement & { value?: string }).value = "";
    this._setButtons([...this._buttons, { entity }]);
  }

  // ha-sortable puts the dragged element back itself, and leaves the
  // new order to the config
  private _buttonMoved(ev: CustomEvent): void {
    const { oldIndex, newIndex } = ev.detail as {
      oldIndex: number;
      newIndex: number;
    };
    const buttons = [...this._buttons];
    buttons.splice(newIndex, 0, ...buttons.splice(oldIndex, 1));
    this._setButtons(buttons);
  }

  private _removeButton(index: number): void {
    this._setButtons(this._buttons.filter((_, i) => i !== index));
  }

  private _renderButton(button: ButtonConfig, index: number): TemplateResult {
    return html`
      <div class="button-row">
        <div class="handle"><ha-icon icon="mdi:drag"></ha-icon></div>
        <ha-expansion-panel outlined>
          <span slot="header"
            >${buttonName(button, this.hass.states[button.entity ?? ""])}</span
          >
          <div class="button-content">
            <ha-form
              .hass=${this.hass}
              .data=${button}
              .schema=${BUTTON_SCHEMA}
              .computeLabel=${this._computeLabel}
              @value-changed=${(ev: CustomEvent) =>
                this._buttonChanged(index, ev)}
            ></ha-form>
          </div>
        </ha-expansion-panel>
        <ha-icon-button
          class="remove"
          .label=${this.hass.localize("ui.common.remove")}
          @click=${() => this._removeButton(index)}
          ><ha-icon icon="mdi:delete"></ha-icon
        ></ha-icon-button>
      </div>
    `;
  }

  protected render(): TemplateResult | string {
    if (!this._config || !this.hass) return "";
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ ...CARD_DEFAULTS, ...this._config }}
        .schema=${CARD_SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._cardChanged}
      ></ha-form>
      <ha-sortable handle-selector=".handle" @item-moved=${this._buttonMoved}>
        <div class="buttons">
          ${this._buttons.map((button, i) => this._renderButton(button, i))}
        </div>
      </ha-sortable>
      <ha-entity-picker
        .hass=${this.hass}
        .label=${this.hass.localize("ui.panel.lovelace.editor.entities.add")}
        .includeDomains=${BUTTON_DOMAINS}
        @value-changed=${this._addButton}
      ></ha-entity-picker>
    `;
  }
}
