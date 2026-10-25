/**
 * ASSET LOOKUP — new shared-canvas architecture
 * -------------------------------------------------
 * Every character/scene PNG in this set is exported from the SAME
 * 4167x3334 master canvas, at the same internal coordinates (confirmed by
 * inspecting each file's alpha bounding box — e.g. outfit-default.png and
 * head.png both start at x=2308, and head.png's content sits directly
 * above the outfit's collar). That means correct alignment does not
 * require per-layer manual offsets: stacking every layer at the full
 * canvas size (same width/height, same origin) reproduces the designer's
 * intended composition automatically.
 *
 * No PNG is cropped, resized, or repositioned — only the lookup paths and
 * the (percentage-based) click-hit regions used for the persistent
 * outfit/shoe cycling interaction live here, derived from the measured
 * bounding boxes below.
 */

export const SCENE_CANVAS = { width: 4167, height: 3334 };

// ---- character layers (all share SCENE_CANVAS) ----
export const HEAD_ASSET = "character/hero/head.png";

export const OUTFIT_ASSETS = {
  default: "character/hero/outfits/outfit-default.png",
  casual: "character/hero/outfits/outfit-casual.png",
  stylish: "character/hero/outfits/outfit-stylish.png",
};
export const OUTFIT_ORDER = ["default", "casual", "stylish"];

export const SHOE_ASSETS = {
  "shoes-a": "character/hero/shoes/shoes-a.png",
  "shoes-b": "character/hero/shoes/shoes-b.png",
};
export const SHOE_ORDER = ["shoes-a", "shoes-b"];

export const ACCESSORY_ASSETS = {
  "birthday-hat": "character/hero/accessories/birthday-hat.png",
  laptop: "character/hero/accessories/laptop.png",
};

// Invisible click-hit regions for the persistent outfit/shoe cycling
// interaction, expressed as % of SCENE_CANVAS so they scale with however
// large the animation area is rendered. Derived directly from the measured
// alpha bounding boxes (see inspection notes above) — not guessed:
//   outfit content: x 2308-3482, y 669-3065 (all 3 outfit variants)
//   shoes content:  x 2444-3346, y 2896-3209 (union of both shoe variants)
// The outfit hit region stops just above the shoe content so the two
// click zones don't fight over the same pixels.
export const OUTFIT_HIT_REGION = {
  left: (2308 / SCENE_CANVAS.width) * 100,
  top: (669 / SCENE_CANVAS.height) * 100,
  width: ((3482 - 2308) / SCENE_CANVAS.width) * 100,
  height: ((2860 - 669) / SCENE_CANVAS.height) * 100,
};
export const SHOE_HIT_REGION = {
  left: (2380 / SCENE_CANVAS.width) * 100,
  top: (2860 / SCENE_CANVAS.height) * 100,
  width: ((3400 - 2380) / SCENE_CANVAS.width) * 100,
  height: ((3334 - 2860) / SCENE_CANVAS.height) * 100,
};

// Dedicated click-hit regions for foreground/clickable objects, so their
// clicks win over the (much larger) outfit/shoe hit regions above whenever
// they visually overlap — e.g. birthday-hat's bbox dips down into
// OUTFIT_HIT_REGION's top edge, laptop and cake both sit fully inside it,
// and envelope overlaps it too. Each region below is measured from that
// asset's own alpha bounding box (union of both states where relevant):
//   birthday-hat: x 2604-3171, y 330-1009
//   laptop:       x 2513-3264, y 1978-2474
//   cake:         x 3030-3908, y 1806-2662 (union of lit/blown)
//   envelope:     x 2364-3397, y 1582-2674 (union of closed/open)
function pctRegion(x1, y1, x2, y2) {
  return {
    left: (x1 / SCENE_CANVAS.width) * 100,
    top: (y1 / SCENE_CANVAS.height) * 100,
    width: ((x2 - x1) / SCENE_CANVAS.width) * 100,
    height: ((y2 - y1) / SCENE_CANVAS.height) * 100,
  };
}
export const HAT_HIT_REGION = pctRegion(2604, 330, 3171, 1009);
export const LAPTOP_HIT_REGION = pctRegion(2513, 1978, 3264, 2474);
export const CAKE_HIT_REGION = pctRegion(3030, 1806, 3908, 2662);

// The new envelope-closed/open PNGs are pre-positioned on the shared
// 4167x3334 canvas (like every other character/scene layer) — their
// content already sits at the canvas's horizontal middle (~41-58%),
// naturally between the companion and the hero. Rendered full-bleed like everything
// else; no CSS repositioning. This hit-region only exists so a click on
// the envelope's actual pixels takes priority over the outfit hit-region,
// whose left edge (55.4%) it slightly overlaps — measured from the union
// of both envelope states' alpha bounding boxes: x 1705-2429, y 2111-2874.
export const ENVELOPE_HIT_REGION = pctRegion(1705, 2111, 2429, 2874);

// Keyboard: measured directly from the artwork (cropped the PNG to
// its bbox and inspected it) — the key-bed is NOT the full lower half of
// the image; it starts lower and is narrower than the control panel above
// it. Full bbox is x 1038-2351, y 1793-2622; the actual white/black keys
// occupy x 1123-2293, y 2211-2563 within that. (An earlier, unmeasured
// estimate placed this ~7% too high, which likely caused clicks near the
// top of the keys to miss the hit-targets entirely.)
export const KEYBOARD_KEYS_REGION = pctRegion(1123, 2211, 2293, 2563);
export const KEYBOARD_KEY_COUNT = 8;
// Standard QWERTY home-row piano mapping (A S D F G H J K).
export const KEYBOARD_KEY_LETTERS = ["A", "S", "D", "F", "G", "H", "J", "K"];
// C4-C5, one full octave — simple sine tones, no samples/library.
export const KEYBOARD_KEY_FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
export const KEYBOARD_KEY_NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B", "C"];

// ---- backgrounds (also on SCENE_CANVAS) ----
export const BACKGROUND_ASSETS = {
  "scene-1": "background/scene-1.png",
  "scene-2": "background/scene-2.png",
  "scene-3": "background/scene-3.png",
};
export const BACKGROUND_ORDER = ["scene-1", "scene-2", "scene-3"];
export const BACKGROUND_LABELS = {
  "scene-1": "The Swiss Alps",
  "scene-2": "Svalbard, Norway",
  "scene-3": "Aizawl, Mizoram",
};

// The background photo doesn't fill the full canvas height (bbox measured
// at x 467-4099, y 631-3117 — content_bbox, i.e. the photo has transparent
// margins top/bottom). Arrows/label are positioned relative to the PHOTO
// itself, not the full canvas, per that measurement.
export const BACKGROUND_IMAGE_BOUNDS = {
  verticalCenter: ((631 + 3117) / 2 / SCENE_CANVAS.height) * 100,
  bottom: (3117 / SCENE_CANVAS.height) * 100,
};

// ---- companion character ----
export const COMPANION_ASSET = "character/companion/companion.png"; // entering
export const COMPANION_CLOSER_ASSET = "character/companion/companion-closer.png"; // during love sequence

// ---- scene objects (SHOW_OBJECT effect.object id -> file) ----
export const OBJECT_ASSETS = {
  "toy-car": "objects/toy-car.png",
  keyboard: "objects/keyboard.png",
  "confetti-burst": "objects/confetti.png",
  dumbbell: "objects/dumbbell.png",
};

export const LOVE_SEQUENCE_ASSET = "objects/heart-bubble.png";
export const BALLOON_ASSET = "objects/balloon.png";

// ---- finale sequence (envelope -> letter text from content-config.js), driven by TRIGGER_FINALE ----
export const ENVELOPE_ASSETS = {
  closed: "envelope/envelope-closed.png",
  open: "envelope/envelope-open.png",
};

export const CAKE_ASSETS = {
  lit: "objects/cake-lit.png",
  blown: "objects/cake-blown.png",
};
