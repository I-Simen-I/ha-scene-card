import { LitElement, html, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";

import "./button";
import "./editor";
import { buttonName, isTemplate, toButton } from "./config";
import { cardStyles } from "./style";
import {
  ButtonConfig,
  CardConfig,
  HassEntity,
  HomeAssistant,
  NormalizedButton,
  NormalizedConfig,
} from "./types";

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      preview: boolean;
      description: string;
    }>;
  }
}

// The button texts that can be templates
const TEMPLATE_FIELDS = ["name", "secondary"] as const;
type TemplateField = (typeof TEMPLATE_FIELDS)[number];

const normalizeButton = (button: ButtonConfig | string): NormalizedButton => ({
  tap_action: { action: "toggle" },
  ...toButton(button),
});

@customElement("ha-scene-card")
export class HaSceneCard extends LitElement {
  @state() private config!: NormalizedConfig;
  // The entity of each button, compared by reference to skip re-renders
  @state() private _states: Array<HassEntity | undefined> = [];

  // Rendered templates, by "<button index>.<field>"
  @state() private _rendered: Record<string, string> = {};

  private _hass?: HomeAssistant;
  // Kept while unchanged, so buttons only render again for their own entity
  private _labels: string[] = [];
  private _templateSubscriptions?: Array<Promise<() => void>>;

  static styles = cardStyles;

  static getConfigElement(): HTMLElement {
    return document.createElement("ha-scene-card-editor");
  }

  static getStubConfig(hass: HomeAssistant): CardConfig {
    const buttons = Object.keys(hass.states)
      .filter((id) => ["input_boolean", "switch"].includes(id.split(".")[0]))
      .slice(0, 3)
      .map((entity) => ({ entity }));
    return { buttons };
  }

  // Masonry dashboards, in units of 50px
  getCardSize(): number {
    const { buttons, title, show_name } = this.config;
    const buttonRows = show_name ? 3 : 2;
    return (buttons.length ? buttonRows : 0) + (title ? 1 : 0);
  }

  // Sections dashboards. Rows are left to the default, which sizes the
  // card to its content.
  getGridOptions(): { columns: number; min_columns: number } {
    return { columns: 12, min_columns: 3 };
  }

  setConfig(config: CardConfig): void {
    if (config.buttons !== undefined && !Array.isArray(config.buttons)) {
      throw new Error("`buttons` must be a list.");
    }
    if (
      config.buttons?.some(
        (b) => !b || !["string", "object"].includes(typeof b),
      )
    ) {
      throw new Error("Each button must be an entity id or an object.");
    }
    this.config = {
      ...config,
      show_name: config.show_name ?? true,
      buttons: (config.buttons ?? []).map(normalizeButton),
    };
    // The templates may have changed. Results stay until new ones arrive,
    // so the editor preview doesn't flicker.
    this._unsubscribeTemplates();
    if (this._hass) {
      // Re-run the hass setter to pick up changed entities and templates
      this.hass = this._hass;
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this.config) return;
    const states = this.config.buttons.map((b) =>
      b.entity ? hass.states[b.entity] : undefined,
    );
    if (
      states.length !== this._states.length ||
      states.some((s, i) => s !== this._states[i])
    ) {
      this._states = states;
    }
    this._subscribeTemplates();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._subscribeTemplates();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribeTemplates();
  }

  // Home Assistant renders the templates and sends a new result whenever
  // an entity they use changes, like the markdown card
  private _subscribeTemplates(): void {
    if (this._templateSubscriptions || !this._hass || !this.isConnected) {
      return;
    }
    const subscriptions: Array<Promise<() => void>> = [];
    this._templateSubscriptions = subscriptions;
    this.config.buttons.forEach((button, i) => {
      for (const field of TEMPLATE_FIELDS) {
        const template = button[field];
        if (!isTemplate(template)) continue;
        const key = `${i}.${field}`;
        const subscription = this._hass!.connection.subscribeMessage<{
          result?: unknown;
        }>(
          (msg) => {
            // Ignore results of subscriptions that have been replaced
            if (this._templateSubscriptions !== subscriptions) return;
            if (!("result" in msg)) return;
            this._rendered = { ...this._rendered, [key]: String(msg.result) };
          },
          {
            type: "render_template",
            template,
            variables: { entity: button.entity },
          },
        );
        subscription.catch((err) =>
          console.warn(`ha-scene-card: template ${template}:`, err),
        );
        subscriptions.push(subscription);
      }
    });
  }

  private _unsubscribeTemplates(): void {
    this._templateSubscriptions?.forEach((subscription) =>
      subscription.then((unsubscribe) => unsubscribe()).catch(() => {}),
    );
    this._templateSubscriptions = undefined;
  }

  private _text(
    button: NormalizedButton,
    i: number,
    field: TemplateField,
  ): string | undefined {
    const text = button[field];
    return isTemplate(text) ? (this._rendered[`${i}.${field}`] ?? "") : text;
  }

  protected updated(changedProps: PropertyValues): void {
    if (!changedProps.has("config")) return;
    this._applyToElement("card-mod", this.config.card_mod);
    this._applyToElement("uix-node", this.config.uix);
  }

  // Look the class up instead of relying on the value `whenDefined`
  // resolves with, which is undefined in some browsers
  private _applyToElement(tag: string, styleConfig: unknown): void {
    customElements.whenDefined(tag).then(() => {
      const element = customElements.get(tag) as unknown as {
        applyToElement: (...args: unknown[]) => void;
      };
      element.applyToElement(
        this,
        "card",
        styleConfig,
        { config: this.config },
        true,
        "type-custom-ha-scene-card",
      );
    });
  }

  protected render(): TemplateResult | typeof nothing {
    const { title, center_title, show_name, buttons } = this.config;
    // Like a stack without cards, an empty card takes no space
    if (!title && !buttons.length) return nothing;
    const texts = buttons.map((b, i) => ({
      primary: buttonName(
        { ...b, name: this._text(b, i, "name") },
        this._states[i],
      ),
      secondary: this._text(b, i, "secondary") ?? "",
    }));
    const labels = texts
      .flatMap((t) => [t.primary, t.secondary])
      .filter(Boolean);
    if (labels.join("\n") !== this._labels.join("\n")) this._labels = labels;
    return html`
      <ha-card>
        ${
          title
            ? html`<div class="title" ?centered=${center_title}>${title}</div>`
            : nothing
        }
        <div class="buttons">
          ${buttons.map(
            (button, i) => html`
              <ha-scene-card-button
                .hass=${this._hass}
                .config=${button}
                .stateObj=${this._states[i]}
                .primary=${texts[i].primary}
                .secondary=${texts[i].secondary}
                .labels=${this._labels}
                .defaultColor=${this.config.color}
                ?hide-name=${!show_name}
              ></ha-scene-card-button>
            `,
          )}
        </div>
      </ha-card>
    `;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-scene-card",
  name: "HA Scene Card",
  preview: true,
  description: "A row of scene buttons that show which scene is active",
});

console.info(
  `%c HA Scene Card %c ${__VERSION__} `,
  "background-color: #555;color: #fff;padding: 3px 2px 3px 3px;border-radius: 14px 0 0 14px;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)",
  "background-color: #506eac;color: #fff;padding: 3px 3px 3px 2px;border-radius: 0 14px 14px 0;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)",
);
