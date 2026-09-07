import { MOTION_DELAY, MOTION_DURATION } from "./motion-tokens.mjs";

export const NAV_HOVER_DELAY = MOTION_DURATION.quick;
export const NAV_OPEN_DURATION = MOTION_DURATION.emphasis;
export const NAV_SWITCH_DURATION = MOTION_DURATION.quick;
export const NAV_SWITCH_HEIGHT_DURATION = MOTION_DURATION.surface;
export const NAV_DESKTOP_CLOSE_DELAY = MOTION_DURATION.quick;
export const NAV_MOBILE_CLOSE_DELAY = MOTION_DELAY.navigation;

export function getNavigationDuration(height) {
  return Math.max(MOTION_DURATION.control, Math.min(MOTION_DURATION.control * 2, Math.max(0, Number(height) || 0) / 2));
}

export function getNavigationPhaseDuration(phase, panelDuration, mobile = false) {
  if (phase === "switching") return Math.max(NAV_SWITCH_DURATION, NAV_SWITCH_HEIGHT_DURATION);
  if (phase === "opening" && !mobile) return NAV_OPEN_DURATION;
  const closeDelay = mobile ? NAV_MOBILE_CLOSE_DELAY : NAV_DESKTOP_CLOSE_DELAY;
  return Math.max(NAV_OPEN_DURATION, panelDuration + (phase === "closing" ? closeDelay : 0));
}

export const initialNavigationState = { menu: null, phase: "closed" };

export function navigationReducer(state, action) {
  if (action.type === "reset") return initialNavigationState;
  if (action.type === "select") {
    if (state.menu === action.menu) return state;
    return {
      menu: action.menu,
      phase: action.menu === null ? "closing" : state.menu ? "switching" : "opening",
    };
  }
  if (action.type === "settle" && state.menu === action.menu && state.phase === action.phase) {
    return { menu: state.menu, phase: state.menu ? "open" : "closed" };
  }
  return state;
}

export function createHoverIntent(onIntent, timers = { setTimeout, clearTimeout }) {
  let timer;
  const cancel = () => {
    if (timer !== undefined) timers.clearTimeout(timer);
    timer = undefined;
  };
  return {
    cancel,
    schedule(menu) {
      cancel();
      timer = timers.setTimeout(() => {
        timer = undefined;
        onIntent(menu);
      }, NAV_HOVER_DELAY);
    },
  };
}
