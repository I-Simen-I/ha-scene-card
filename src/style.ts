import { css } from "lit";

// One line, cut off with "..." when it doesn't fit
const ellipsis = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const cardStyles = css`
  ha-card {
    padding: 12px;
  }
  .title {
    margin: 0 4px 12px;
    ${ellipsis}
    color: var(--primary-text-color);
    font-size: 16px;
    line-height: 24px;
  }
  .title[centered] {
    text-align: center;
  }
  .buttons {
    display: flex;
    justify-content: space-around;
    gap: 8px;
  }
`;

// Flat pills without border or shadow: a light tint of the text color, so
// they work on light and dark themes
export const buttonStyles = css`
  /* As wide as the content: the icon, or the card's widest text (see
     .names). Buttons shrink equally, with ellipsis, when space runs out. */
  :host {
    display: block;
    flex: 0 1 auto;
    min-width: 0;
  }
  /* Without a name: narrower and lower, still an oval */
  :host([hide-name]) .button {
    padding: 6px 6px 22px;
  }
  .button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    /* Fully round ends, and as much space beside the icon as above it */
    padding: 9px 9px 27px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--primary-text-color) 5%, transparent);
    color: var(--primary-text-color);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 180ms ease-in-out;
  }
  .button[role="button"] {
    cursor: pointer;
  }
  .button[role="button"]:hover {
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  }
  /* A hint of the scene's color shows the active button from afar */
  .button[active] {
    background: color-mix(in srgb, var(--scene-color) 12%, transparent);
  }
  .button[active][role="button"]:hover {
    background: color-mix(in srgb, var(--scene-color) 18%, transparent);
  }
  .button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: var(--secondary-text-color);
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    --mdc-icon-size: 22px;
    transition:
      color 180ms ease-in-out,
      background-color 180ms ease-in-out;
  }
  .button[active] .icon {
    color: var(--scene-color);
    background: color-mix(in srgb, var(--scene-color) 20%, transparent);
  }
  .button[unavailable] {
    opacity: 0.5;
  }
  .texts {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 100%;
    min-width: 0;
  }
  /* Every text of the card is stacked here, only this button's name
     visible, so all buttons get the width of the widest text */
  .names {
    display: grid;
    max-width: 100%;
    font-size: 12px;
    line-height: 16px;
  }
  .secondary {
    max-width: 100%;
    ${ellipsis}
    color: var(--secondary-text-color);
    font-size: 11px;
    line-height: 14px;
  }
  .names > span {
    grid-area: 1 / 1;
    min-width: 0;
    ${ellipsis}
    text-align: center;
  }
  .sizer {
    visibility: hidden;
  }
`;
