export interface HassEntity {
  state: string;
  attributes: {
    [key: string]: unknown;
    friendly_name?: string;
  };
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  localize: (key: string) => string;
  connection: {
    subscribeMessage: <Result>(
      callback: (result: Result) => void,
      msg: Record<string, unknown>,
    ) => Promise<() => void>;
  };
}

// Home Assistant handles every action type, so only `action` is read here
export interface ActionConfig {
  action: string;
  [key: string]: unknown;
}

export interface ButtonConfig {
  entity?: string;
  // Both can be templates, see isTemplate
  name?: string;
  secondary?: string;
  icon?: string;
  color?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface CardConfig {
  type?: string;
  title?: string;
  center_title?: boolean;
  show_name?: boolean;
  color?: string;
  buttons?: Array<ButtonConfig | string>;
  // Passed on to card-mod and UIX as they are
  card_mod?: unknown;
  uix?: unknown;
}

export interface NormalizedButton extends ButtonConfig {
  tap_action: ActionConfig;
}

export interface NormalizedConfig extends Omit<
  CardConfig,
  "buttons" | "show_name"
> {
  buttons: NormalizedButton[];
  show_name: boolean;
}
