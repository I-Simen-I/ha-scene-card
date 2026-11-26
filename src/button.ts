import { LitElement, html, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import { ActionType, fireAction, hasAction } from "./actions";
import { computeCssColor } from "./color";
import { buttonStyles } from "./style";
import { HassEntity, HomeAssistant, NormalizedButton } from "./types";

const HOLD_TIME = 500;
const DOUBLE_TAP_TIME = 250;

const MISSING_ICON = "mdi:help-circle-outline";

// One button of the card. The card only passes a new `stateObj` when the
// button's entity changed, so other state changes don't render it again.
@customElement("ha-scene-card-button")
export class HaSceneCardButton extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) config!: NormalizedButton;
  @property({ attribute: false }) stateObj?: HassEntity;
  @property({ attribute: false }) defaultColor?: string;
  // The texts, with templates rendered by the card
  @property({ attribute: false }) primary = "";
  @property({ attribute: false }) secondary = "";
  // Every text of all buttons in the card, which set the shared width
  @property({ attribute: false }) labels: string[] = [];
  // Set by the card; the styles make the button narrower without a name
  @property({ type: Boolean, attribute: "hide-name", reflect: true })
  hideName = false;

  private _holdTimer?: number;
  private _held = false;
  private _tapTimer?: number;

  static styles = buttonStyles;

  // Only entities that are on count as active, so input_boolean, switch,
  // light and the like work as scenes with a state
  get active(): boolean {
    return this.stateObj?.state === "on";
  }

  private get _holdable(): boolean {
    return this._actionable && hasAction(this.config.hold_action);
  }

  private get _actionable(): boolean {
    return (
      this.stateObj !== undefined &&
      (hasAction(this.config.tap_action) ||
        hasAction(this.config.hold_action) ||
        hasAction(this.config.double_tap_action))
    );
  }

  protected render(): TemplateResult {
    const missing = this.stateObj === undefined;
    const unavailable =
      missing ||
      this.stateObj?.state === "unavailable" ||
      this.stateObj?.state === "unknown";
    const actionable = this._actionable;
    const toggles = this.config.tap_action.action === "toggle";
    const name = [this.primary, this.secondary].filter(Boolean).join(", ");
    const color = computeCssColor(
      this.config.color ?? this.defaultColor ?? "primary",
    );
    return html`
      <div
        class="button"
        role=${actionable ? "button" : nothing}
        tabindex=${actionable ? "0" : nothing}
        aria-pressed=${actionable && toggles ? String(this.active) : nothing}
        ?active=${this.active}
        ?unavailable=${unavailable}
        title=${name}
        aria-label=${this.hideName ? name : nothing}
        style="--scene-color: ${color}"
        @click=${this._handleClick}
        @keydown=${this._handleKeyDown}
        @pointerdown=${this._handlePointerDown}
        @pointerup=${this._cancelHold}
        @pointercancel=${this._cancelHold}
        @pointerleave=${this._cancelHold}
        @contextmenu=${this._handleContextMenu}
      >
        <div class="icon">
          ${
            missing
              ? html`<ha-icon
                  .icon=${this.config.icon ?? MISSING_ICON}
                ></ha-icon>`
              : html`<ha-state-icon
                  .hass=${this.hass}
                  .stateObj=${this.stateObj}
                  .icon=${this.config.icon}
                ></ha-state-icon>`
          }
        </div>
        ${this.hideName ? nothing : this._renderTexts()}
      </div>
    `;
  }

  private _renderTexts(): TemplateResult {
    return html`
      <div class="texts">
        <div class="names">
          ${this.labels.map(
            (label) =>
              html`<span class="sizer" aria-hidden="true">${label}</span>`,
          )}
          <span class="name">${this.primary}</span>
        </div>
        ${
          this.secondary
            ? html`<span class="secondary">${this.secondary}</span>`
            : nothing
        }
      </div>
    `;
  }

  private _fire(action: ActionType): void {
    fireAction(this, this.config, action);
  }

  private _handleClick(): void {
    if (!this._actionable) return;
    // The click that ends a hold shouldn't also count as a tap
    if (this._held) {
      this._held = false;
      return;
    }
    if (!hasAction(this.config.double_tap_action)) {
      this._fire("tap");
      return;
    }
    // Wait briefly to see whether a second tap follows
    if (this._tapTimer !== undefined) {
      clearTimeout(this._tapTimer);
      this._tapTimer = undefined;
      this._fire("double_tap");
    } else {
      this._tapTimer = window.setTimeout(() => {
        this._tapTimer = undefined;
        this._fire("tap");
      }, DOUBLE_TAP_TIME);
    }
  }

  private _handlePointerDown(): void {
    this._held = false;
    if (!this._holdable) return;
    this._holdTimer = window.setTimeout(() => {
      this._held = true;
      this._fire("hold");
    }, HOLD_TIME);
  }

  private _cancelHold(): void {
    clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
  }

  // Long-pressing on touch screens opens the context menu otherwise
  private _handleContextMenu(ev: Event): void {
    if (this._holdable) ev.preventDefault();
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (!this._actionable || (ev.key !== "Enter" && ev.key !== " ")) return;
    ev.preventDefault();
    this._fire("tap");
  }
}
