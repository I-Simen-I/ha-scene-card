// Home Assistant serves /local/ with a 31 day cache, so load the card with
// a unique URL on every page load to always get the latest build.
import(`/local/ha-scene-card/ha-scene-card.js?t=${Date.now()}`);
