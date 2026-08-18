/**
 * Workspace2 Canvas Groups - adapted from ComfyUI-xiaozhuguang DOM overlay groups
 * 选中节点 → Ctrl+Q → 创建固定大小编组框
 */

import { app } from "../../scripts/app.js";
import { t } from "./core/i18n.js";
import { ensureWorkspaceKitDialogStyles } from "./core/dialog_styles.js";
import { GROUP_POINTER_ACTION, GROUP_POINTER_BINDINGS_KEY, normalizeGroupPointerBindings, resolveGroupPointerAction } from "./canvas-groups/pointer-actions.js?v=20260724_configurable_modifiers_r1";
import { buildMultiGroupDragPlan, hasNodePosition } from "./canvas-groups/multi-drag-plan.js?v=20260804_joint_drag_r1";
import { buildGroupContentsSelectionPlan } from "./canvas-groups/contents-selection-plan.js?v=20260804_group_header_select_contents_r1";
import { GROUP_HIT_REGION_SELECTOR, shouldPassThroughGroupHitRegions } from "./canvas-groups/hit-region-passthrough.js?v=20260805_group_node_hit_priority_r1";
import { isNodeInsideGroup } from "./canvas-groups/node-membership.js?v=20260805_group_centre_membership_r1";
import { HEADER_CLICK_SELECTION, hasSelectionModifier, resolveHeaderClickSelection } from "./canvas-groups/header-click-selection.js?v=20260805_group_header_click_reset_r1";
import { resolveRenameInputMetrics } from "./canvas-groups/rename-input-metrics.js?v=20260805_group_rename_input_zoom_r1";
import { GROUP_MODE_STATE, hexToRgbTriplet, resolveGroupFillPaint, resolveGroupModeVisuals } from "./canvas-groups/group-mode-visuals.js?v=20260805_group_mode_native_visuals_r1";
import {
    ACTION_ICON_VISIBILITY,
    isPointInsideBounds,
    resolveActionIconVisibility,
    resolveQueueIconOpacity,
} from "./canvas-groups/action-icon-visibility.js?v=20260805_group_action_icon_hover_r1";
import {
    DRAG_MOVE_EVENT_NAMES,
    DRAG_TEARDOWN_EVENT_NAMES,
    createOnceGuard,
    shouldAbortDragFromMove,
} from "./canvas-groups/drag-teardown.js?v=20260805_joint_drag_teardown_r1";
import {
    normalizeHexColor,
    readNativeGroupColorPresets,
    resolveWorkspaceKitGroupNativeColor,
} from "./canvas-groups/native-color-compat.js?v=20260804_native_group_color_r1";
import {
    CUSTOM_PRESET_COLOR,
    clipboardValueForPreset,
    displayColorForNativeHex,
    headerOpacityForNativeHex,
    migrateLegacyPresetBorderWidth,
    presetCopiesNativeName,
    titleColorForNativeHex,
} from "./canvas-groups/preset-color-display.js?v=20260806_preset_color_display_r1";
import {
    shouldClearGroupSelectionFromKeyEvent,
    shouldClearGroupSelectionFromPointerEvent,
} from "./canvas-groups/selection-cancel-events.js?v=20260724_group_ctrl_marquee_r2";
import { shouldDeleteSelectedWorkspaceKitGroups } from "./canvas-groups/delete-key-events.js?v=20260724_group_delete_key_r1";
import {
    groupIdsContainedInMarquee,
    hasMeaningfulMarqueeDrag,
    marqueeRectFromPoints,
    shouldStartGroupMarquee,
} from "./canvas-groups/marquee-selection.js?v=20260724_group_ctrl_marquee_r1";
import {
    createWorkspaceKitGroupConversionArchive,
    validateWorkspaceKitGroupConversionArchive,
} from "./canvas-groups/conversion-archive.js?v=20260727_group_conversion_archive_r1";
import { validateNativeGroupConversionResult, countStaleWorkspaceKitNodeMarkers } from "./canvas-groups/conversion-result.js?v=20260727_group_conversion_result_c3";
import { createNativeToWorkspaceKitConversionPlan } from "./canvas-groups/reverse-conversion-plan.js?v=20260727_group_reverse_conversion_c6_2";
import { resolveNodeVisualBounds } from "./canvas-groups/node-visual-bounds.js?v=20260817_nodes2_visual_bounds_p0";
import {
    isNodes2Enabled,
    setNodeGraphPositionFromStart,
} from "./canvas-groups/node-position-sync.js?v=20260818_nodes2_group_layout_bridge_r1";

const MODE_ALWAYS = 0;
const MODE_BYPASS = 4;
const DEFAULT_STYLE_KEY = 'workspace2.canvasGroups.defaultStyle';
const PRESET_STYLE_KEY = 'workspace2.canvasGroups.stylePresets';
const ACTIVE_PRESET_KEY = 'workspace2.canvasGroups.activePreset';
const PRESET_COUNT = 4;
/*
 * T-045: the border width every preset path lands on.
 *
 * One constant rather than a literal per call site, because three separate
 * places must agree — a new group's built-in style, applying a colour swatch,
 * and native → WK conversion. When they disagreed, "the border is 1px" was true
 * in one place and false in the other two.
 *
 * Note the border is drawn scaled (`borderWidth * scale`), so at a zoomed-out
 * canvas 1px would round to nothing; `renderGroup`/`updateGroupStyle` already
 * floor the drawn width at one device pixel, which is what keeps a 1px border
 * visible rather than vanishing.
 */
const PRESET_BORDER_WIDTH = 1;
/*
 * T-045: presets saved before PRESET_BORDER_WIDTH existed carry the old 2px.
 *
 * A stored preset overrides the built-in style, so a user who had ever saved one
 * kept getting 2px no matter what the built-in default said — which is exactly
 * how "new groups are still not 1px" was reported after the default was changed.
 * `migrateLegacyPresetBorderWidth()` rewrites only that field, and only from the
 * one legacy value, so a width the user deliberately chose is left alone.
 */
const LEGACY_PRESET_BORDER_WIDTH = 2;
const PRESET_BORDER_MIGRATION_KEY = 'workspace2.canvasGroups.borderWidthMigrated';
const DEFAULT_CONTENT_PADDING = 12;
// T-210a (2026-07-29): default header opacity matches ComfyUI/LiteGraph's group
// fill coefficient (ctx.globalAlpha = 0.25 * editor_alpha). The body fill is now
// always derived as headerAlpha * 0.5, so this compat default is 0.25 * 0.5.
const DEFAULT_HEADER_OPACITY = 0.25;
const BODY_TO_HEADER_OPACITY_RATIO = 0.5;
// T-212b (2026-07-29): the title-bar opacity slider is capped at 50%. A higher
// value made the derived body fill (headerAlpha * 0.5) too strong. Legacy data
// above this is clamped down when the dialog opens (consistency over preserving
// an out-of-range value).
const MAX_HEADER_OPACITY = 0.5;
const MIN_HEADER_OPACITY = 0.05;
const DEFAULT_BACKGROUND_OPACITY = DEFAULT_HEADER_OPACITY * BODY_TO_HEADER_OPACITY_RATIO;
const DEFAULT_HEADER_BG_COLOR = `rgba(0,0,0,${DEFAULT_HEADER_OPACITY})`;
const DEFAULT_SHADOW_COLOR = '#000000';
// These are only a stable fallback when a frontend exposes fewer than ten
// native LiteGraph group colours. Normal rendering reads the current runtime
// `LGraphCanvas.node_colors[*].groupcolor` palette instead.
const GROUP_BACKGROUND_SWATCH_HUES = Object.freeze(
    Array.from({ length: 10 }, (_, index) => index * 36)
);
const GROUP_BACKGROUND_SWATCH_SATURATION = 25;
const GROUP_BACKGROUND_SWATCH_LIGHTNESS = 75;
// T-212a/T-212c: per-theme preset recipes. Dark theme keeps the established
// look (light swatch title bar + bright same-hue font). Light theme uses a
// slightly deeper title bar and pure-white font/border so text stays legible on
// a light canvas. The header alpha is applied separately; only RGB comes from
// these. Light values are the user's tested choice (2026-07-29).
const GROUP_PRESET_THEME = Object.freeze({
    dark: Object.freeze({
        title: Object.freeze({ s: GROUP_BACKGROUND_SWATCH_SATURATION, l: GROUP_BACKGROUND_SWATCH_LIGHTNESS }),
        font: Object.freeze({ s: 100, l: 90 }),
    }),
    light: Object.freeze({
        title: Object.freeze({ s: 50, l: 80 }),
        font: null, // null → pure white (#ffffff)
    }),
});
const DEFAULT_GROUP_TITLE_KEY = 'groups.defaultTitle';

function defaultGroupTitle() {
    const translated = String(t(DEFAULT_GROUP_TITLE_KEY) || '').trim();
    // A raw i18n key is never a valid user-facing group title. This fallback
    // protects group creation/recovery if a locale asset has not loaded yet.
    return translated && translated !== DEFAULT_GROUP_TITLE_KEY
        ? translated
        : 'Group (right-click to edit)';
}

function normalizeGroupTitle(value) {
    const title = String(value || '').trim();
    return title && title !== DEFAULT_GROUP_TITLE_KEY ? title : defaultGroupTitle();
}

const finiteNumber = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

// The body fill deliberately reuses the title-bar RGB value.  Only its alpha
// is independent, so users do not have to maintain a second color swatch.
const clamp01 = value => Math.max(0, Math.min(1, finiteNumber(value, 0)));

const parseRgbaRgb = (value, fallback = { r: 0, g: 0, b: 0 }) => {
    const m = String(value || '').match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (!m) return fallback;
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
};

const parseRgbaAlpha = (value, fallback = DEFAULT_HEADER_OPACITY) => {
    const m = String(value || '').match(/rgba?\([\d,\.\s]+,\s*([\d.]+)\)$/i);
    return m ? finiteNumber(m[1], fallback) : fallback;
};

/*
 * T-044: the display half of the store-native/paint-bright split.
 *
 * A group persists LiteGraph's exact `groupcolor` RGB inside `headerBgColor` so
 * rgthree's colour filter and native conversion keep matching it. Painting runs
 * that RGB through the palette's display table first, which brightens the five
 * muddy shorthand entries and leaves every other colour — including any custom
 * one the user picked — untouched. See canvas-groups/preset-color-display.js.
 */
const displayRgbFromStored = (rgba, fallback = { r: 0, g: 0, b: 0 }) => {
    const stored = parseRgbaRgb(rgba, fallback);
    const display = displayColorForNativeHex(
        `#${[stored.r, stored.g, stored.b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`
    );
    if (!display) return stored;
    return {
        r: parseInt(display.slice(1, 3), 16),
        g: parseInt(display.slice(3, 5), 16),
        b: parseInt(display.slice(5, 7), 16),
    };
};

// Native LiteGraph groups expose a single solid `color` field (a hex string),
// while a WorkspaceKit group carries a translucent `headerBgColor` (rgba) plus a
// separate `titleColor`. When converting to native we cannot represent all three
// layers, so we approximate: if the user gave the group a meaningful color, keep
// its title-bar RGB as a solid hex; if the group is still on the default (a near
// black rgba(0,0,0,x)), return null so the caller leaves `color` unset and the
// native group falls back to ComfyUI's own default palette instead of rendering
// an all-black box. (rgbToHex is defined below, alongside the color presets.)
const nativeColorFromWorkspaceKitGroup = group => {
    const explicit = normalizeHexColor(group?.nativeGroupColor);
    if (explicit) return explicit;
    const rgb = parseRgbaRgb(group?.headerBgColor, null);
    if (!rgb || (rgb.r <= 8 && rgb.g <= 8 && rgb.b <= 8)) return null;
    return resolveWorkspaceKitGroupNativeColor(group);
};

// T-210b (2026-07-29): body fill RGB is always the title-bar RGB, and body alpha
// is strictly half the title-bar alpha. No independent backgroundOpacity slider
// value gates it anymore (the earlier min-of-header-and-background clamp is
// gone), so the body cannot desync from the title bar.
const groupBodyBackground = (group, visuals = null) => {
    if (!group?.backgroundFillEnabled) return 'transparent';
    const rgb = displayRgbFromStored(group.headerBgColor);
    const headerAlpha = clamp01(parseRgbaAlpha(group.headerBgColor, DEFAULT_HEADER_OPACITY));
    const bodyAlpha = clamp01(headerAlpha * BODY_TO_HEADER_OPACITY_RATIO);
    // T-038: the fill is painted on the canvas, so the DOM `opacity` that dims a
    // bypassed/muted frame cannot reach it. Fold the mode's alpha (and, for
    // bypass, its magenta) in here or the body stays full strength under a
    // 20%-opacity border, which reads as a rendering fault instead of a state.
    const paint = resolveGroupFillPaint({ visuals, rgb, alpha: bodyAlpha });
    return `rgba(${paint.r},${paint.g},${paint.b},${paint.alpha})`;
};

/*
 * T-038: the colour that marks "ignored" must be whatever the NODES use, since
 * the entire point is that a frame and its contents agree.
 *
 * Measured on the live page (2026-08-05) rather than assumed:
 *
 *   LiteGraph.NODE_BYPASS_BGCOLOR       = '#cba6f7'   (lavender)
 *   LiteGraph.NODE_DEFAULT_BYPASS_COLOR = '#FF00FF'
 *   a bypassed node's renderingBgColor  = hsla(300,100%,50%,0.9)  → #FF00FF
 *
 * So the node rendering path reads NODE_DEFAULT_BYPASS_COLOR and ignores
 * NODE_BYPASS_BGCOLOR, even though the latter is the name that appears in the
 * theme colour-palette schema. Reading the schema name first (as this originally
 * did) painted the frame lavender while its nodes went magenta — precisely the
 * split this change exists to remove. NODE_BYPASS_BGCOLOR is kept as a second
 * choice for builds that lack the first, and resolveBypassColor() supplies
 * ComfyUI's own default when neither is usable.
 */
const runtimeBypassColor = () => (
    globalThis.LiteGraph?.NODE_DEFAULT_BYPASS_COLOR
    ?? globalThis.LiteGraph?.NODE_BYPASS_BGCOLOR
    ?? null
);

/* T-038: one frame's mode treatment, with the live magenta folded in. */
const groupModeVisuals = group => resolveGroupModeVisuals({
    bypassed: group?.bypassed,
    executionMode: group?.executionMode,
    bypassColor: runtimeBypassColor(),
});

/*
 * T-038: the title bar's paint under the current mode.
 *
 * The title bar is the group's closest analogue to a node's background, and
 * native replaces the background colour for bypass only. The user's own alpha is
 * preserved so a frame keeps its configured translucency while ignored — only
 * the hue changes. Mute and normal return the stored colour untouched.
 *
 * T-044: the stored RGB goes through the display table first, so a muddy native
 * preset paints as its brightened form while the workflow keeps the native hex.
 */
const groupHeaderBackground = (group, visuals = null) => {
    const stored = group?.headerBgColor || DEFAULT_HEADER_BG_COLOR;
    const resolved = visuals || groupModeVisuals(group);
    if (resolved.tintColor) {
        return replaceRgbaRgbPreserveAlpha(stored, hexToRgbTriplet(resolved.tintColor));
    }
    return replaceRgbaRgbPreserveAlpha(stored, displayRgbFromStored(stored));
};

// HSL (H in [0,360), S/L in [0,100]) → {r,g,b} in [0,255]. Used for the fixed
// background swatches and for hex conversion of swatch colors.
const hslToRgb = (h, s, l) => {
    const sat = clamp01(s / 100);
    const lit = clamp01(l / 100);
    const a = sat * Math.min(lit, 1 - lit);
    const f = n => {
        const k = (n + h / 30) % 12;
        return Math.round(255 * (lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
    };
    return { r: f(0), g: f(8), b: f(4) };
};

const rgbToHex = ({ r, g, b }) =>
    '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');

// Stable fallback colours used only if LiteGraph supplies fewer than ten valid
// `groupcolor` entries. They retain the old visual order for offline/legacy
// frontends without becoming the source of truth on current ComfyUI.
const GROUP_COLOR_PRESETS = Object.freeze(GROUP_BACKGROUND_SWATCH_HUES.map(hue => {
    const rgb = hslToRgb(hue, GROUP_BACKGROUND_SWATCH_SATURATION, GROUP_BACKGROUND_SWATCH_LIGHTNESS);
    return Object.freeze({ key: `fallback-h${hue}`, hue, rgb, hex: rgbToHex(rgb) });
}));

const groupTitleColorForBackground = hex => {
    const value = String(hex || '#000000');
    const r = parseInt(value.slice(1, 3), 16) || 0;
    const g = parseInt(value.slice(3, 5), 16) || 0;
    const b = parseInt(value.slice(5, 7), 16) || 0;
    return rgbLuma({ r, g, b }) > 0.56 ? '#17212b' : '#ffffff';
};

// Replace only the RGB channels of an rgba() string, preserving its alpha.
const replaceRgbaRgbPreserveAlpha = (rgba, rgb, fallbackAlpha = DEFAULT_HEADER_OPACITY) => {
    const alpha = clamp01(parseRgbaAlpha(rgba, fallbackAlpha));
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
};

// Relative luminance of an "r,g,b" or {r,g,b} value, 0..1 (sRGB-weighted).
const rgbLuma = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// The "11th fixed color": hue 190° — a cyan that sits in the gap between the
// 180° and 216° background swatches, so it duplicates none of the ten. It reuses
// the exact same title/font recipe as those swatches (dark theme) and drives the
// built-in default group style, which in turn feeds all four preset slots, the
// reset (↺) button, and every newly created group (user request 2026-07-30).
// Values are static (dark recipe, no DOM probe) so getBuiltInStyle() stays safe
// to call outside the browser (serialize/restore/contract tests). Background
// fill remains OFF by default — only the title bar and its derived body tint.
const DEFAULT_GROUP_HUE = 190;
const DEFAULT_GROUP_TITLE_RGB = hslToRgb(DEFAULT_GROUP_HUE, GROUP_BACKGROUND_SWATCH_SATURATION, GROUP_BACKGROUND_SWATCH_LIGHTNESS);
const DEFAULT_GROUP_FONT_HEX = rgbToHex(hslToRgb(DEFAULT_GROUP_HUE, GROUP_PRESET_THEME.dark.font.s, GROUP_PRESET_THEME.dark.font.l));
const DEFAULT_GROUP_HEADER_BG = `rgba(${DEFAULT_GROUP_TITLE_RGB.r},${DEFAULT_GROUP_TITLE_RGB.g},${DEFAULT_GROUP_TITLE_RGB.b},${DEFAULT_HEADER_OPACITY})`;


const Workspace2CanvasGroups = {
    initialized: false,
    version: "20260727-group-background-underlay-r1",
    groups: {},       // groupId → {id, title, nodeIds, bypassed, bounds, fontSize}
    groupEls: {},
    _nativeRepresentation: false,
    selectedGroupIds: new Set(), // transient canvas-only selection; never serialized
    lastCanvasContextPoint: null,
    canvasMarquee: null,
    // Auto membership uses a group's visual bounds.  During a multi-drag the
    // bounds and members must move as one transaction, otherwise the periodic
    // bounds scan can evict members between pointer events.
    _suspendMembershipSync: false,
    overlay: null,
    noticeHandler: null,
    // T-041: last known pointer position, used once per frame to decide whether
    // the group frame's drag/resize strips must yield to a node underneath.
    _lastPointerClient: null,
    _hitRegionsPassThrough: false,
    // T-036: monotonic z-index counter for bringToFront. See `bringToFront` in
    // buildGroupEl for why stacking can no longer be done by re-appending.
    _frontZ: 5,

    setNoticeHandler(handler) {
        this.noticeHandler = typeof handler === 'function' ? handler : null;
    },

    async showNotice(message) {
        if (this.noticeHandler) {
            await this.noticeHandler({ title: t('groups.title'), message });
            return;
        }
        console.warn(`[Workspace2 Canvas Groups] ${message}`);
    },

    init() {
        if (this.initialized) return;
        this.initialized = true;
        window.Workspace2CanvasGroupsVersion = this.version;
        this.shortcutKey = 'g';
        console.log('[Workspace2 Canvas Groups] init');

        this.createOverlay();
        this.setupKeyboardShortcut();
        // Canvas and node menus are registered by entry.js through ComfyUI's
        // extension hooks. Do not patch LiteGraph's global menu prototype:
        // that shared prototype is also used by other sidebar extensions.
        this.setupSerializationHooks();
        this.setupGroupPointerActions();
        this.startSyncLoop();
        this.waitForGraph();
    },

    /* ── 鼠标中键事件转发：设置 pointer-events: none 后向画布派发事件 ── */
    _dispatchMiddleDown(clientX, clientY) {
        const targets = [];
        // 1) elementFromPoint 找到的实际下方元素（跳过已设 pointer-events: none 的编组元素）
        const under = document.elementFromPoint(clientX, clientY);
        if (under) targets.push(under);
        // 2) app.canvas.canvas（画布 DOM 元素）
        const cvs = app?.canvas?.canvas;
        if (cvs && !targets.includes(cvs)) targets.push(cvs);
        // 3) app.canvas 的 container/父元素
        const container = app?.canvas?.graphcanvas?.parentElement || app?.canvas?.canvas?.parentElement;
        if (container && !targets.includes(container)) targets.push(container);

        const opts = { clientX, clientY, button: 1, buttons: 4, bubbles: true, cancelable: true };
        for (const t of targets) {
            t.dispatchEvent(new MouseEvent('mousedown', opts));
            t.dispatchEvent(new PointerEvent('pointerdown', {
                ...opts, pointerId: 1, pointerType: 'mouse', isPrimary: true
            }));
        }
    },

    /* ── 覆盖层 ── */
    createOverlay() {
        const o = document.createElement('div');
        o.id = 'xzg-group-overlay';
        o.style.cssText = 'position:fixed;pointer-events:none;z-index:10;overflow:visible;';
        document.body.appendChild(o);
        this.overlay = o;
    },

    /*
     * Draw optional group fills in LiteGraph's background pass. The DOM
     * overlay remains above the canvas for title-bar actions; putting the body
     * fill in that overlay would paint it over node pixels.
     */
    setupBackgroundRenderer() {
        const canvas = app?.canvas;
        if (!canvas) return;
        if (this._backgroundRendererCanvas === canvas && canvas.__workspace2GroupBackgroundHook) return;

        const previous = typeof canvas.onDrawBackground === 'function'
            ? canvas.onDrawBackground
            : null;
        const self = this;
        canvas.onDrawBackground = function(ctx, visibleArea) {
            if (previous) previous.apply(this, arguments);
            self.drawGroupBackgrounds(ctx, visibleArea);
        };
        canvas.__workspace2GroupBackgroundHook = true;
        this._backgroundRendererCanvas = canvas;
        console.log('[Workspace2 Canvas Groups] 背景填充已接入 ComfyUI onDrawBackground');
    },

    drawGroupBackgrounds(ctx, visibleArea = null) {
        if (!ctx) return;
        const groups = Object.values(this.groups)
            .filter(group => group?.backgroundFillEnabled && (group._previewBounds || group.bounds))
            .sort((a, b) => {
                const ab = a._previewBounds || a.bounds;
                const bb = b._previewBounds || b.bounds;
                return (bb.w * bb.h) - (ab.w * ab.h);
            });
        if (!groups.length) return;

        ctx.save();
        for (const group of groups) {
            const b = group._previewBounds || group.bounds;
            const x = b.x;
            const y = b.y;
            const w = Math.max(0, b.w);
            const h = Math.max(0, b.h);
            if (!w || !h) continue;
            if (Array.isArray(visibleArea) && visibleArea.length >= 4) {
                const [vx, vy, vw, vh] = visibleArea;
                if (x + w < vx || y + h < vy || x > vx + vw || y > vy + vh) continue;
            }

            // Fill the area inside the group border (T-213: concentric nesting
            // with the outer border, so the fill arcs match the border arc minus
            // one border width; the header's translucent DOM color stacks on top).
            const bw = finiteNumber(group.borderWidth, 2);
            const radius = Math.min(Math.max(0, finiteNumber(group.cornerRadius, 8) - bw), w / 2, h / 2);
            const ix = x + bw, iy = y + bw, iw = Math.max(0, w - bw * 2), ih = Math.max(0, h - bw * 2);
            if (!iw || !ih) continue;
            ctx.fillStyle = groupBodyBackground(group, groupModeVisuals(group));
            ctx.beginPath();
            ctx.moveTo(ix + radius, iy);
            ctx.lineTo(ix + iw - radius, iy);
            ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + radius);
            ctx.lineTo(ix + iw, iy + ih - radius);
            ctx.quadraticCurveTo(ix + iw, iy + ih, ix + iw - radius, iy + ih);
            ctx.lineTo(ix + radius, iy + ih);
            ctx.quadraticCurveTo(ix, iy + ih, ix, iy + ih - radius);
            ctx.lineTo(ix, iy + radius);
            ctx.quadraticCurveTo(ix, iy, ix + radius, iy);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    },

    syncOverlayPosition() {
        const c = app?.canvas?.canvas;
        if (!c || !this.overlay) return;
        const r = c.getBoundingClientRect();
        this.overlay.style.left = r.left + 'px';
        this.overlay.style.top = r.top + 'px';
        this.overlay.style.width = r.width + 'px';
        this.overlay.style.height = r.height + 'px';
    },

    /* ── 快捷键 ── */
    setupKeyboardShortcut() {
        // Ctrl+G is a ComfyUI core keybinding (GroupSelectedNodes). Workspace2
        // registers shortcuts through app.registerExtension instead of stealing
        // document/window key events here.
    },

    /* ── 编组修饰键：Ctrl=忽略，Alt=禁止，Shift=多选 ── */
    setupGroupPointerActions() {
        document.addEventListener('mousedown', e => {
            let storedBindings = null;
            try { storedBindings = JSON.parse(localStorage.getItem(GROUP_POINTER_BINDINGS_KEY) || ""); } catch { /* default mapping */ }
            const action = resolveGroupPointerAction(e, normalizeGroupPointerBindings(storedBindings));
            if (!action) return;
            const groupEl = e.target?.closest?.('.xzg-group-box');
            const gid = groupEl?.dataset?.groupId;
            if (!gid || !this.groups[gid]) return;
            // Header controls and resize handles retain their own single-group
            // behaviour; modifier gestures belong only to a group surface.
            if (e.target?.closest?.('button, input, select, textarea, .xzg-resize-handle')) return;
            e.preventDefault();
            e.stopPropagation();
            if (action === GROUP_POINTER_ACTION.SELECT) {
                this.toggleGroupSelection(gid);
            } else if (action === GROUP_POINTER_ACTION.BYPASS) {
                this.toggleGroupExecutionMode(gid, 'bypass');
            } else if (action === GROUP_POINTER_ACTION.MUTE) {
                this.toggleGroupExecutionMode(gid, 'mute');
            }
        }, true);

        // Use window capture rather than document capture.  A third-party
        // extension can stop propagation on document before WorkspaceKit sees
        // the event; window is earlier in the capture path.  Restrict this to
        // the real canvas so ordinary toolbar/sidebar clicks do not alter a
        // transient canvas selection.
        window.addEventListener('pointerdown', e => {
            if (e.button === 2) this.recordCanvasContextPoint(e);
            // Do not take over LiteGraph's node drag.  When an already selected
            // node is the drag origin, expand that native selection with the
            // selected WK groups' persisted members, then only move the WK
            // borders here.  LiteGraph remains the sole owner of node motion.
            if (e.button === 0 && this.prepareNativeNodeJointGroupDrag(e)) {
                return;
            }
            if (shouldStartGroupMarquee(e, app?.canvas?.canvas)) {
                this.beginCanvasMarquee(e);
            } else if (shouldClearGroupSelectionFromPointerEvent(e, app?.canvas?.canvas)) {
                this.clearGroupSelection();
            }
        }, true);

        // This runs after ComfyUI has received the same native Ctrl marquee.
        // Do not call preventDefault or stopPropagation here: native node and
        // LiteGraph-group selection must continue to work exactly as before.
        window.addEventListener('pointerup', e => this.finishCanvasMarquee(e), true);
        window.addEventListener('pointercancel', e => this.cancelCanvasMarquee(e), true);

        window.addEventListener('keydown', e => {
            if (shouldClearGroupSelectionFromKeyEvent(e, document.activeElement)) {
                this.clearGroupSelection();
                return;
            }
            if (shouldDeleteSelectedWorkspaceKitGroups(e, {
                activeElement: document.activeElement,
                selectedGroupCount: this.selectedGroupIds.size,
            })) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation?.();
                this.removeSelectedGroups();
            }
        }, true);

        // The ComfyUI menu hook supplies callbacks rather than the original
        // pointer event. Keep only the latest canvas context position so an
        // empty group can be created exactly where the user opened the menu.
        window.addEventListener('contextmenu', e => this.recordCanvasContextPoint(e), true);

        // T-041: track the pointer so the per-frame sync can decide whether the
        // group frame's drag/resize strips must yield to a node underneath.
        // pointermove alone is not enough — the pointer can stop over a node
        // while the graph moves under it (canvas pan, node drag, zoom), so the
        // decision is re-evaluated every frame from this stored position.
        const trackPointer = e => {
            this._lastPointerClient = { clientX: e.clientX, clientY: e.clientY, buttons: e.buttons };
        };
        window.addEventListener('pointermove', trackPointer, true);
        window.addEventListener('pointerdown', trackPointer, true);
        window.addEventListener('pointerup', trackPointer, true);
        window.addEventListener('pointerleave', () => { this._lastPointerClient = null; }, true);
    },

    /*
     * T-041: yield the group frame's drag/resize strips to a node underneath.
     *
     * The overlay sits above every node pixel, so a strip with
     * `pointer-events: auto` steals clicks that native ComfyUI would have given
     * to the node (native resolves `getNodeOnPos` before any group — see
     * docs/NATIVE_BEHAVIOR_REFERENCE.md §3).  Toggling the strips off lets
     * LiteGraph receive a genuine browser event, which matters because it calls
     * `setPointerCapture(e.pointerId)` and a synthesised pointer cannot satisfy
     * that.
     *
     * The title bar is never yielded: it carries the rename input and the action
     * buttons.
     */
    _syncHitRegionPassThrough() {
        const point = this._lastPointerClient;
        const graph = app?.graph;
        let nodeUnderPointer = false;
        if (point && graph?._nodes?.length && !(Number(point.buttons) > 0)) {
            const canvasPoint = this.getCanvasPointFromPointerEvent(point);
            if (canvasPoint) {
                nodeUnderPointer = Boolean(
                    graph.getNodeOnPos?.(canvasPoint.x, canvasPoint.y, graph._nodes, 5)
                );
            }
        }
        const passThrough = shouldPassThroughGroupHitRegions({
            hasPointer: Boolean(point),
            nodeUnderPointer,
            buttons: point?.buttons ?? 0,
        });
        if (passThrough === this._hitRegionsPassThrough) return;
        this._hitRegionsPassThrough = passThrough;
        const value = passThrough ? 'none' : 'auto';
        this.overlay?.querySelectorAll?.(GROUP_HIT_REGION_SELECTOR)?.forEach(el => {
            el.style.pointerEvents = value;
        });
    },

    recordCanvasContextPoint(event) {
        const canvas = app?.canvas?.canvas;
        const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
        if (!canvas || !(path.includes(canvas) || event?.target === canvas)) return false;
        const rect = canvas.getBoundingClientRect();
        const ds = app?.canvas?.ds;
        const scale = ds?.scale || 1;
        this.lastCanvasContextPoint = {
            x: (event.clientX - rect.left) / scale - (ds?.offset?.[0] || 0),
            y: (event.clientY - rect.top) / scale - (ds?.offset?.[1] || 0),
        };
        return true;
    },

    getCanvasPointFromPointerEvent(event) {
        const canvas = app?.canvas?.canvas;
        const ds = app?.canvas?.ds;
        if (!canvas || !ds || !Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) return null;
        const rect = canvas.getBoundingClientRect();
        const scale = ds.scale || 1;
        return {
            x: (event.clientX - rect.left) / scale - (ds.offset?.[0] || 0),
            y: (event.clientY - rect.top) / scale - (ds.offset?.[1] || 0),
        };
    },

    prepareNativeNodeJointGroupDrag(event) {
        // Modifier gestures have explicit meanings for WK groups and native
        // ComfyUI selection.  A normal left drag is the only safe path to join.
        if (event.ctrlKey || event.altKey || event.shiftKey || !this.selectedGroupIds.size) return false;
        const canvas = app?.canvas;
        const graph = app?.graph;
        const point = this.getCanvasPointFromPointerEvent(event);
        if (!canvas?.selectItems || !canvas?.deselectAllNodes || !graph?._nodes || !point) return false;
        const hitNode = graph.getNodeOnPos?.(point.x, point.y, graph._nodes, 5);
        if (!hitNode?.id) return false;

        const selectedNodes = Object.values(canvas.selected_nodes || {}).filter(Boolean);
        if (!selectedNodes.some((node) => String(node?.id) === String(hitNode.id))) return false;
        const plan = buildMultiGroupDragPlan({
            groups: this.groups,
            nodes: graph._nodes,
            selectedGroupIds: [...this.selectedGroupIds],
            selectedNodeIds: selectedNodes.map((node) => node.id),
        });
        if (!plan.groupIds.length || !plan.nodeIds.length) return false;

        // `selectItems` is the existing ComfyUI canvas API already used by WK
        // for Queue Selected Output Nodes.  Replacing the selection with the
        // complete union before LiteGraph receives this event prevents a group
        // member from being left behind, while the drag itself stays native.
        const selectedIds = new Set(plan.nodeIds);
        const unionNodes = graph._nodes.filter((node) => selectedIds.has(String(node?.id)));
        canvas.deselectAllNodes();
        canvas.selectItems(unionNodes);
        this.startNativeNodeJointGroupDrag(plan, event);
        return true;
    },

    beginCanvasMarquee(event) {
        this.canvasMarquee = {
            pointerId: event.pointerId,
            start: { x: event.clientX, y: event.clientY },
        };
    },

    finishCanvasMarquee(event) {
        const marquee = this.canvasMarquee;
        if (!marquee || (marquee.pointerId != null && event.pointerId != null && marquee.pointerId !== event.pointerId)) return false;
        this.canvasMarquee = null;
        const end = { x: event.clientX, y: event.clientY };
        if (!hasMeaningfulMarqueeDrag(marquee.start, end)) return false;
        const ids = groupIdsContainedInMarquee(this.groupEls, marqueeRectFromPoints(marquee.start, end))
            .filter((groupId) => Boolean(this.groups[groupId]));
        if (!ids.length) return false;
        for (const groupId of ids) this.selectedGroupIds.add(groupId);
        this.activeGroupId = ids.at(-1) || this.activeGroupId;
        this.refreshGroupSelection();
        return true;
    },

    cancelCanvasMarquee(event) {
        if (!this.canvasMarquee || (this.canvasMarquee.pointerId != null && event.pointerId != null && this.canvasMarquee.pointerId !== event.pointerId)) return false;
        this.canvasMarquee = null;
        return true;
    },

    toggleGroupSelection(gid) {
        if (!this.groups[gid]) return;
        if (this.selectedGroupIds.has(gid)) this.selectedGroupIds.delete(gid);
        else this.selectedGroupIds.add(gid);
        this.activeGroupId = this.selectedGroupIds.size ? gid : null;
        this.refreshGroupSelection();
    },

    selectOnlyGroup(gid) {
        if (!this.groups[gid]) return;
        if (this.selectedGroupIds.size === 1 && this.selectedGroupIds.has(gid)) return;
        this.selectedGroupIds = new Set([gid]);
        this.activeGroupId = gid;
        this.refreshGroupSelection();
    },

    // Rename has an explicit left-header button. Double-click can therefore
    // select a complete group hierarchy without competing for the same gesture.
    selectGroupContents(gid) {
        const canvas = app?.canvas;
        const graph = app?.graph;
        const plan = buildGroupContentsSelectionPlan({
            groups: this.groups,
            nodes: graph?._nodes || [],
            groupId: gid,
        });
        if (!plan.groupIds.length && !plan.nodeIds.length) return false;

        this.selectedGroupIds = new Set(plan.groupIds);
        this.activeGroupId = String(gid);
        const nodeIds = new Set(plan.nodeIds);
        const nodes = (graph?._nodes || []).filter((node) => nodeIds.has(String(node?.id)));
        canvas?.deselectAllNodes?.();
        if (nodes.length) canvas?.selectItems?.(nodes);
        this.refreshGroupSelection();
        canvas?.setDirty?.(true, true);
        graph?.setDirtyCanvas?.(true, true);
        window.Workspace2CanvasGroupsLastContentsSelection = {
            at: Date.now(), rootGroupId: String(gid), groupIds: [...plan.groupIds], nodeIds: [...plan.nodeIds],
        };
        return true;
    },

    prepareGroupDrag(gid) {
        if (!this.selectedGroupIds.has(gid)) this.selectOnlyGroup(gid);
        this.activeGroupId = gid;
    },

    clearGroupSelection() {
        if (!this.selectedGroupIds.size) return;
        this.selectedGroupIds.clear();
        this.refreshGroupSelection();
    },

    refreshGroupSelection() {
        // T-205 (2026-07-28): both single and multi selection show the same
        // outline so a single selected group is visibly selected. The line is
        // a very thin, low-key solid rule (1px) rather than the old 2px dashed
        // marquee, and a blank-canvas click still clears it via clearSelection.
        for (const [gid, el] of Object.entries(this.groupEls)) {
            const showSelection = this.selectedGroupIds.has(gid);
            el.classList.toggle('is-xzg-group-selected', showSelection);
            el.style.outline = showSelection ? '1px solid rgba(180, 180, 180, 0.5)' : 'none';
            el.style.outlineOffset = showSelection ? '4px' : '0';
        }
    },

    /* ── 同步循环 ── */
    startSyncLoop() {
        const self = this;
        const loop = () => {
            self.syncOverlayPosition();
            self.setupBackgroundRenderer();
            // 有未恢复的编组数据且 graph 有节点时立即恢复（不依赖 canvas）
            if (self._needRestore && self._pendingGroups && app?.graph?._nodes?.length) {
                self.restoreGroups();
            }
            self.updatePositions();
            self._raf = requestAnimationFrame(loop);
        };
        this._raf = requestAnimationFrame(loop);
        this._syncLoopStarted = true;

        // 立即响应画布缩放/平移，消除渲染延迟
        this._setupImmediateSync();
    },

    /* ── 立即同步：消除画布缩放时编组框的渲染延迟 ── */
    _setupImmediateSync() {
        if (this._immediateSyncReady) return;
        this._immediateSyncReady = true;
        const self = this;

        // 节流：避免短时间内重复更新
        let _syncPending = false;
        const scheduleSync = () => {
            if (_syncPending) return;
            _syncPending = true;
            requestAnimationFrame(() => {
                _syncPending = false;
                self.updatePositions();
            });
        };

        const tryHook = () => {
            const ds = app?.canvas?.ds;
            if (!ds) { setTimeout(tryHook, 100); return; }

            // Hook changeScale：缩放时立即更新位置
            const origCS = ds.changeScale;
            ds.changeScale = function() {
                origCS.apply(this, arguments);
                scheduleSync();
            };

            // Hook changeOffset：平移时立即更新位置
            const origCO = ds.changeOffset;
            ds.changeOffset = function() {
                origCO.apply(this, arguments);
                scheduleSync();
            };

            // Hook 鼠标拖拽平移（中键/空格拖拽）
            const origM = ds.onMouseMove;
            if (origM) {
                ds.onMouseMove = function() {
                    origM.apply(this, arguments);
                    scheduleSync();
                };
            }

            // 监听 canvas 上的 wheel 事件（缩放）
            const cv = app?.canvas?.canvas;
            if (cv) {
                cv.addEventListener('wheel', () => scheduleSync(), { passive: true });
            }

            console.log('[Workspace2 Canvas Groups] 即时同步钩子已安装');
        };
        tryHook();
    },

    /** 缓存每个编组框的DOM子元素引用，避免每帧 querySelector */
    _ensureRefs(el) {
        if (!el._xzgRefs) {
            el._xzgRefs = {
                title: el.querySelector('.xzg-group-title-text'),
                body: el.querySelector('.xzg-group-body'),
                delBtn: el.querySelector('.xzg-delete-btn'),
                rpath: el.querySelector('.xzg-resize-handle svg path')
            };
        }
        return el._xzgRefs;
    },

    updatePositions() {
        const c = app?.canvas;
        if (!c?.ds) return;
        const scale = c.ds.scale || 1;
        const ox = c.ds.offset[0] || 0;
        const oy = c.ds.offset[1] || 0;

        // T-041: re-check every frame, not only on pointermove — the graph can
        // move under a stationary pointer (canvas pan, node drag, zoom).
        this._syncHitRegionPassThrough();

        if (Object.keys(this.groups).length === 0) {
            const graph = app?.graph;
            if (graph?._nodes?.length) {
                let hasGroupData = false;
                for (const n of graph._nodes) {
                    if (n._xzgGroupId || n._xzgGroupData || n.properties?._xzgGroup) {
                        hasGroupData = true;
                        break;
                    }
                }
                if (hasGroupData) {
                    console.log('[Workspace2 Canvas Groups] 检测到编组数据丢失，自动恢复');
                    this._needRestore = true;
                    this.restoreGroups();
                }
            }
        }

        // T-038: the action icons' visibility is geometric (see the loop below),
        // so resolve the pointer into canvas space once per frame rather than
        // per group — the conversion is identical for every frame on screen.
        const pointerClient = this._lastPointerClient;
        const pointerCanvasPoint = pointerClient
            ? this.getCanvasPointFromPointerEvent(pointerClient)
            : null;
        const pointerHeld = Number(pointerClient?.buttons) > 0;

        for (const [gid, g] of Object.entries(this.groups)) {
            const el = this.groupEls[gid];
            if (!el) continue;
            const b = g._previewBounds || g.bounds;
            if (!b) { el.style.display = 'none'; continue; }
            el.style.display = 'block';
            el.style.left = ((b.x + ox) * scale) + 'px';
            el.style.top = ((b.y + oy) * scale) + 'px';
            el.style.width = (b.w * scale) + 'px';
            el.style.height = (b.h * scale) + 'px';

            // 标题文字/栏高度跟随画布缩放（无标题时保留最小操作区域）
            const fs = (g.fontSize || 14) * scale;
            const showTitle = (g.title || '').trim() !== '';
            const headerHeight = Math.max(21 * scale, fs * 1.8);
            // T-038: the title bar is the group's closest analogue to a node's
            // background, and native replaces that colour for ignore only.
            const modeVisuals = groupModeVisuals(g);
            const header = el.querySelector('.xzg-group-header');
            if (header) {
                const padV = 2 * scale;
                header.style.top = '0px';
                header.style.height = headerHeight + 'px';
                header.style.paddingLeft = (6 * scale) + 'px';
                header.style.paddingRight = (6 * scale) + 'px';
                header.style.paddingTop = padV + 'px';
                header.style.paddingBottom = padV + 'px';
                header.style.background = showTitle ? groupHeaderBackground(g, modeVisuals) : 'transparent';
            }
            const body = el.querySelector('.xzg-group-body');
            if (body) {
                body.style.top = headerHeight + 'px';
                // Body fill is rendered by onDrawBackground, beneath nodes.
                body.style.background = 'transparent';
            }
            const span = el.querySelector('.xzg-group-title-text');
            if (span) {
                span.style.fontSize = fs + 'px';
                // T-202 (2026-07-28): line-height must leave room for
                // descenders (g/y/p/j). line-height:1 clipped them against the
                // overflow-hidden header. 1.4 matches the roomier system-default
                // group title proportions the user accepted.
                span.style.lineHeight = '1.4';
                span.style.color = g.titleColor || '#FFD700';
                span.style.display = showTitle ? '' : 'none';
            }
            // T-036: an open rename box must follow zoom like the title it
            // replaced. It is created in startRename, outside this loop, so
            // without this it froze at whatever scale was active when it opened.
            const titleInput = el.querySelector('.xzg-group-title-input');
            if (titleInput) {
                const m = resolveRenameInputMetrics({ scale, fontSize: g.fontSize });
                titleInput.style.fontSize = `${m.fontSize}px`;
                titleInput.style.padding = `${m.paddingV}px ${m.paddingH}px`;
                titleInput.style.borderWidth = `${m.borderWidth}px`;
                titleInput.style.borderRadius = `${m.borderRadius}px`;
                titleInput.style.color = g.titleColor || '#FFD700';
            }
            const delBtn = el.querySelector('.xzg-delete-btn');
            if (delBtn) {
                // Header controls are intentionally proportional to the
                // title size, rather than clamped screen pixels. The DOM
                // overlay must visually follow both title settings and zoom.
                delBtn.style.fontSize = `${headerHeight * 0.72}px`;
                delBtn.style.marginLeft = `${headerHeight * 0.1}px`;
            }
            const actions = el.querySelector('.xzg-group-header-actions');
            if (actions) {
                actions.style.fontSize = `${headerHeight * 0.78}px`;
                actions.style.gap = `${headerHeight * 0.07}px`;
                actions.style.marginLeft = `${headerHeight * 0.12}px`;
            }
            const modeButtons = el.querySelectorAll('.xzg-group-mode-btn');
            // T-038: the five action icons appear while the pointer is anywhere
            // inside this frame, not just on its title bar. That cannot be a CSS
            // :hover — the frame's middle is `pointer-events:none` so nodes stay
            // clickable, so it never receives a mouse event. Hence the geometric
            // test, re-run every frame because the graph can move under a
            // stationary pointer. `visibility` (not `display`) preserves the
            // layout box so the title never jumps when the icons come and go.
            const iconsVisible = resolveActionIconVisibility({
                pointerInside: isPointInsideBounds(b, pointerCanvasPoint),
                // A drag or resize routinely outruns the pointer past the frame
                // edge; hiding the icons mid-gesture would make the bar flicker.
                isGesturing: pointerHeld && (gid === this.activeGroupId || this.selectedGroupIds.has(gid)),
                isRenaming: Boolean(el.querySelector('.xzg-group-title-input')),
            }) === ACTION_ICON_VISIBILITY.VISIBLE;
            const iconVisibility = iconsVisible ? 'visible' : 'hidden';
            if (delBtn) delBtn.style.visibility = iconVisibility;
            // Resize affordances follow the same geometric hover rule as the
            // title-bar actions. The frame itself is pointer-events:none so
            // nodes remain interactive; a CSS :hover rule would therefore
            // fail over the group body. Keep the handles visible throughout a
            // gesture, otherwise there would be no reliable target to finish
            // a resize after the pointer leaves a corner.
            const resizeHandlesVisible = isPointInsideBounds(b, pointerCanvasPoint)
                || (pointerHeld && (gid === this.activeGroupId || this.selectedGroupIds.has(gid)));
            el.querySelectorAll('.xzg-resize-handle').forEach((handle) => {
                handle.style.opacity = resizeHandlesVisible ? '0.6' : '0';
                handle.style.pointerEvents = resizeHandlesVisible ? 'auto' : 'none';
            });
            // T-039: the execute icon dims when the group holds nothing that can
            // produce an image, reusing the very count the click path already
            // checks so a dim icon and its "no output nodes" notice cannot disagree.
            // Only computed while the icons are actually visible: the probe scans
            // every graph node per group, and this loop runs every frame.
            const queueOpacity = iconsVisible
                ? resolveQueueIconOpacity(this._getGroupOutputNodes(g).length)
                : null;
            modeButtons.forEach(btn => {
                // Use headerHeight rather than raw font size: controls stay
                // inside the title bar for large custom fonts while still
                // following title settings and canvas zoom proportionally.
                const buttonSize = headerHeight * 0.78;
                const iconSize = buttonSize * 0.72;
                btn.style.width = `${buttonSize}px`;
                btn.style.height = `${buttonSize}px`;
                btn.style.fontSize = `${headerHeight * 0.78}px`;
                btn.style.borderRadius = `${headerHeight * 0.12}px`;
                // Buttons previously relied on inline baseline layout.  SVG
                // glyphs therefore looked optically high/low inside a colored
                // active tile. Flex centering makes every action share the
                // same visual center regardless of its path geometry.
                btn.style.display = 'inline-flex';
                btn.style.alignItems = 'center';
                btn.style.justifyContent = 'center';
                btn.style.lineHeight = '0';
                btn.style.visibility = iconVisibility;
                if (queueOpacity !== null && btn.dataset.groupAction === 'queue') {
                    btn.style.opacity = String(queueOpacity);
                }
                // SVG has explicit dimensions so it tracks the same title
                // metric as the DOM text at every canvas zoom level.
                const icon = btn.querySelector('svg');
                if (icon) {
                    icon.style.width = `${iconSize}px`;
                    icon.style.height = `${iconSize}px`;
                    icon.style.display = 'block';
                }
                // 图标色与标题色同步。T-038 起状态由整框表达，图标不再有激活底色。
                btn.style.color = g.titleColor || '#FFD700';
            });
            ['xzg-border-left', 'xzg-border-right'].forEach(cls => {
                const be = el.querySelector('.' + cls);
                if (be) be.style.top = headerHeight + 'px';
            });

            // 自动收纳/释放节点（降低频率：每10帧检测一次）
            if (!this._suspendMembershipSync && (!el._xzgSyncFrame || el._xzgSyncFrame <= 0)) {
                this.syncNodeMembership(g, b);
                el._xzgSyncFrame = 10;
            }
            el._xzgSyncFrame--;

            // 每帧同步样式 + 动画效果
            this.updateGroupStyle(gid);
            if (g.bypassed) continue;

            const e = g.effect;
            if (!e || e === 'none') {
                this.applyUserShadow(el, g, scale);
                el.style.borderImage = 'none';
                el.style.background = 'transparent';
                continue;
            }

            const refs = this._ensureRefs(el);
            const spd = (g.effectSpeed || 3) / 3;
            const bw = finiteNumber(g.borderWidth, 2) * scale;
            const bo = g.borderOpacity ?? 0.65;
            const cr = Math.max(0, finiteNumber(g.cornerRadius, 8)) * scale;

            // 非marquee效果重置文字样式
            if (e !== 'marquee' && e !== 'marqueebreathe') {
                el.style.overflow = 'hidden';
                el.style.background = 'transparent';
                if (refs.title) {
                    refs.title.style.background = '';
                    refs.title.style.webkitBackgroundClip = '';
                    refs.title.style.webkitTextFillColor = '';
                    refs.title.style.backgroundClip = '';
                }
            }

            switch (e) {
            case 'rainbow': {
                const t = (Date.now() / 4500) * spd;
                const h = (t * 360) % 360;
                el.style.borderImage = 'none';
                el.style.border = `${bw}px solid hsla(${h},80%,55%,${bo})`;
                this.applyUserShadow(el, g, scale);
                if (refs.delBtn) refs.delBtn.style.color = `hsla(${h},80%,55%,${Math.min(bo + 0.1, 1)})`;
                if (refs.rpath) refs.rpath.setAttribute('stroke', `hsla(${h},80%,55%,${bo})`);
                if (refs.title) refs.title.style.color = `hsla(${h},80%,55%,0.85)`;
                break;
            }
            case 'pulse': {
                const t = (Date.now() / 2000) * spd;
                const a = Math.abs(Math.sin(t));
                const h = g.colorHue ?? 48;
                el.style.borderImage = 'none';
                el.style.border = `${bw}px solid hsla(${h},${g.colorSat||100}%,${g.colorLit||55}%,${a.toFixed(2)})`;
                this.applyUserShadow(el, g, scale);
                if (refs.delBtn) refs.delBtn.style.color = `hsla(${h},${g.colorSat||100}%,${g.colorLit||55}%,${a.toFixed(2)})`;
                if (refs.rpath) refs.rpath.setAttribute('stroke', `hsla(${h},${g.colorSat||100}%,${g.colorLit||55}%,${(0.3+a*0.7).toFixed(2)})`);
                if (refs.title) refs.title.style.color = `hsla(${h},${g.colorSat||100}%,${g.colorLit||55}%,${a.toFixed(2)})`;
                break;
            }
            case 'marquee': {
                const t = (Date.now() / 2500) * spd;
                const angle = (t * 360) % 360;
                const h0 = (t * 360) % 360;
                el.style.border = `${Math.max(0, bw)}px solid transparent`;
                el.style.borderRadius = `${cr}px`;
                el.style.overflow = 'hidden';
                el.style.borderImage = `conic-gradient(from ${angle}deg, hsl(0,100%,65%), hsl(30,100%,65%), hsl(60,100%,65%), hsl(90,100%,65%), hsl(120,100%,65%), hsl(150,100%,65%), hsl(180,100%,65%), hsl(210,100%,65%), hsl(240,100%,65%), hsl(270,100%,65%), hsl(300,100%,65%), hsl(330,100%,65%), hsl(360,100%,65%)) 1`;
                this.applyUserShadow(el, g, scale);
                if (refs.delBtn) refs.delBtn.style.color = `hsla(${h0},100%,65%,0.6)`;
                if (refs.rpath) refs.rpath.setAttribute('stroke', `hsla(${h0},100%,65%,0.7)`);
                if (refs.title) {
                    refs.title.style.background = `linear-gradient(90deg, hsl(${h0},100%,65%), hsl(${(h0+60)%360},100%,65%), hsl(${(h0+120)%360},100%,65%), hsl(${(h0+180)%360},100%,65%), hsl(${(h0+240)%360},100%,65%), hsl(${(h0+300)%360},100%,65%), hsl(${h0},100%,65%))`;
                    refs.title.style.webkitBackgroundClip = 'text';
                    refs.title.style.webkitTextFillColor = 'transparent';
                    refs.title.style.backgroundClip = 'text';
                    refs.title.style.color = 'transparent';
                }
                break;
            }
            case 'marqueebreathe': {
                const t = (Date.now() / 2500) * spd;
                const wave = Math.abs(Math.sin(t * 2));
                const angle = (t * 360) % 360;
                const h0 = (t * 360) % 360;
                el.style.overflow = 'hidden';
                el.style.border = `${Math.max(0, bw)}px solid transparent`;
                el.style.borderRadius = `${cr}px`;
                el.style.borderImage = `conic-gradient(from ${angle}deg, hsl(0,100%,${5+wave*60}%), hsl(30,100%,${5+wave*60}%), hsl(60,100%,${5+wave*60}%), hsl(90,100%,${5+wave*60}%), hsl(120,100%,${5+wave*60}%), hsl(150,100%,${5+wave*60}%), hsl(180,100%,${5+wave*60}%), hsl(210,100%,${5+wave*60}%), hsl(240,100%,${5+wave*60}%), hsl(270,100%,${5+wave*60}%), hsl(300,100%,${5+wave*60}%), hsl(330,100%,${5+wave*60}%), hsl(360,100%,${5+wave*60}%)) 1`;
                this.applyUserShadow(el, g, scale);
                const lv = 5 + wave * 60;
                if (refs.delBtn) refs.delBtn.style.color = `hsla(${h0},100%,${lv}%,0.6)`;
                if (refs.rpath) refs.rpath.setAttribute('stroke', `hsla(${h0},100%,${lv}%,0.7)`);
                if (refs.title) {
                    refs.title.style.background = `linear-gradient(90deg, hsl(${h0},100%,${lv}%), hsl(${(h0+60)%360},100%,${lv}%), hsl(${(h0+120)%360},100%,${lv}%), hsl(${(h0+180)%360},100%,${lv}%), hsl(${(h0+240)%360},100%,${lv}%), hsl(${(h0+300)%360},100%,${lv}%), hsl(${h0},100%,${lv}%))`;
                    refs.title.style.webkitBackgroundClip = 'text';
                    refs.title.style.webkitTextFillColor = 'transparent';
                    refs.title.style.backgroundClip = 'text';
                    refs.title.style.color = 'transparent';
                }
                break;
            }
            case 'glow': {
                const t = (Date.now() / 2500) * spd;
                const a = 0.4 + Math.abs(Math.sin(t)) * 0.6;
                const h = g.colorHue ?? 48;
                const s = g.colorSat ?? 100;
                const l = g.colorLit ?? 55;
                el.style.borderImage = 'none';
                el.style.border = `${bw}px solid hsla(${h},${s}%,${l}%,${bo})`;
                el.style.boxShadow = `0 0 3px hsla(${h},${s}%,${l}%,1), 0 0 12px hsla(${h},${s}%,${l}%,${a.toFixed(2)}), 0 0 35px hsla(${h},${s}%,${l}%,${(a*0.5).toFixed(2)})`;
                if (refs.delBtn) refs.delBtn.style.color = `hsla(${h},${s}%,${l}%,${Math.min(bo + 0.1, 1)})`;
                if (refs.rpath) refs.rpath.setAttribute('stroke', `hsla(${h},${s}%,${l}%,${bo})`);
                if (refs.title) refs.title.style.color = `hsla(${h},${s}%,${l}%,0.85)`;
                break;
            }
            default:
                this.applyUserShadow(el, g, scale);
                el.style.borderImage = 'none';
                el.style.background = 'transparent';
            }
        }
    },

    /* ── 清理节点上的冗余编组数据 ── */
    _clearNodeGroupData(n) {
        if (!n) return;
        n._xzgGroupId = null;
        n._xzgGroupData = null;
        // Older workflow snapshots also carried the complete group object on
        // the direct `_xzgGroup` field.  Clearing only `_xzgGroupData` and
        // `properties._xzgGroup` left that legacy copy behind; after a native
        // conversion, restoreGroups() could read it back and recreate a
        // non-scaling WorkspaceKit overlay.  Native conversion must remove
        // every WorkspaceKit node marker, not just the current serializer's
        // preferred fields.
        delete n._xzgGroup;
        if (n.properties) {
            delete n.properties._xzgGroup;
        }
    },

    _idEq(a, b) {
        return a === b || a == b;
    },

    _idInArray(arr, id) {
        return arr.some(x => this._idEq(x, id));
    },

    _idInSet(set, id) {
        for (const v of set) {
            if (this._idEq(v, id)) return true;
        }
        return false;
    },

    applyUserShadow(el, group, scale = 1) {
        const size = Math.max(0, finiteNumber(group?.shadowSize, 0)) * scale;
        if (!size) {
            el.style.boxShadow = 'none';
            return;
        }
        const color = group?.shadowColor || DEFAULT_SHADOW_COLOR;
        el.style.boxShadow = `0 0 ${size}px ${color}`;
    },

    getBuiltInStyle() {
        return {
            fontSize: 16,
            colorHue: DEFAULT_GROUP_HUE,
            colorSat: GROUP_PRESET_THEME.dark.font.s,
            colorLit: GROUP_PRESET_THEME.dark.font.l,
            useUnifiedColor: true,
            effect: 'none',
            effectSpeed: 3,
            // T-044/T-045: a new group starts at PRESET_BORDER_WIDTH. Only new
            // groups are affected — an existing group keeps whatever width was
            // configured for it, since overwriting a user's own setting is not
            // recoverable.
            borderWidth: PRESET_BORDER_WIDTH,
            borderOpacity: 0.65,
            cornerRadius: 8,
            shadowSize: 0,
            shadowColor: DEFAULT_SHADOW_COLOR,
            contentPadding: DEFAULT_CONTENT_PADDING,
            headerBgColor: DEFAULT_GROUP_HEADER_BG,
            backgroundFillEnabled: false,
            backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
            titleColor: DEFAULT_GROUP_FONT_HEX,
            nativeGroupColor: rgbToHex(DEFAULT_GROUP_TITLE_RGB),
        };
    },

    readDefaultStyle() {
        const presets = this.readStylePresets();
        const active = this.readActivePreset();
        return presets[active] || this.getBuiltInStyle();
    },

    readActivePreset() {
        const raw = parseInt(localStorage.getItem(ACTIVE_PRESET_KEY) || '0');
        return Number.isFinite(raw) ? Math.max(0, Math.min(PRESET_COUNT - 1, raw)) : 0;
    },

    setActivePreset(index) {
        const normalized = Math.max(0, Math.min(PRESET_COUNT - 1, parseInt(index) || 0));
        localStorage.setItem(ACTIVE_PRESET_KEY, String(normalized));
        return normalized;
    },

    readStylePresets() {
        const builtIn = this.getBuiltInStyle();
        const fallback = Array.from({ length: PRESET_COUNT }, () => ({ ...builtIn }));
        try {
            const raw = JSON.parse(localStorage.getItem(PRESET_STYLE_KEY) || 'null');
            if (Array.isArray(raw) && raw.length) {
                const merged = Array.from({ length: PRESET_COUNT }, (_, i) => ({ ...builtIn, ...(raw[i] && typeof raw[i] === 'object' ? raw[i] : {}) }));
                return this._migratePresetBorderWidth(merged);
            }
        } catch {
            // Fall through to legacy migration.
        }
        try {
            const legacy = JSON.parse(localStorage.getItem(DEFAULT_STYLE_KEY) || 'null');
            if (legacy && typeof legacy === 'object') {
                fallback[0] = { ...builtIn, ...legacy };
                localStorage.setItem(PRESET_STYLE_KEY, JSON.stringify(fallback));
                localStorage.setItem(ACTIVE_PRESET_KEY, '0');
                return this._migratePresetBorderWidth(fallback);
            }
        } catch {}
        return fallback;
    },

    /*
     * T-045: one-time forward migration of the legacy 2px border width.
     *
     * A stored preset overrides the built-in style, so before this ran a user who
     * had ever saved a preset kept getting 2px however the built-in default was
     * changed. Gated on a persisted flag so it cannot fight a user who
     * deliberately sets 2px afterwards.
     */
    _migratePresetBorderWidth(presets) {
        let alreadyDone = false;
        try {
            alreadyDone = localStorage.getItem(PRESET_BORDER_MIGRATION_KEY) === '1';
        } catch {
            return presets;
        }
        if (alreadyDone) return presets;
        const { presets: migrated, changed } = migrateLegacyPresetBorderWidth(presets, {
            from: LEGACY_PRESET_BORDER_WIDTH,
            to: PRESET_BORDER_WIDTH,
        });
        try {
            if (changed) localStorage.setItem(PRESET_STYLE_KEY, JSON.stringify(migrated));
            localStorage.setItem(PRESET_BORDER_MIGRATION_KEY, '1');
        } catch {}
        return migrated;
    },

    saveStylePreset(index, style) {
        const presets = this.readStylePresets();
        const normalized = Math.max(0, Math.min(PRESET_COUNT - 1, parseInt(index) || 0));
        presets[normalized] = { ...this.getBuiltInStyle(), ...style };
        localStorage.setItem(PRESET_STYLE_KEY, JSON.stringify(presets));
        this.setActivePreset(normalized);
        window.Workspace2CanvasGroupsDefaultStyle = presets[normalized];
        return presets[normalized];
    },

    /*
     * T-044: the ten swatches shown in the settings dialog.
     *
     * The first nine come from LiteGraph's live palette so a converted group
     * keeps native colour identity. LiteGraph only ships nine, so the tenth is
     * WorkspaceKit's own rose — placed in the widest hue gap (purple 303° to
     * red 0°) rather than the old #cfafaf, which sat one step from red and made
     * the row look shuffled. GROUP_COLOR_PRESETS remains the fallback for
     * frontends exposing fewer than nine usable entries.
     */
    readColorPresets() {
        const native = readNativeGroupColorPresets(globalThis.LGraphCanvas?.node_colors, GROUP_COLOR_PRESETS, 9);
        const used = new Set(native.map(sw => normalizeHexColor(sw.hex)));
        const custom = { key: CUSTOM_PRESET_COLOR.key, hex: CUSTOM_PRESET_COLOR.hex, source: 'workspacekit' };
        return used.has(normalizeHexColor(custom.hex)) ? native : [...native, custom];
    },

    groupStyleSnapshot(group) {
        return {
            fontSize: group.fontSize || 14,
            colorHue: group.colorHue ?? 48,
            colorSat: group.colorSat ?? 100,
            colorLit: group.colorLit ?? 55,
            useUnifiedColor: Boolean(group.useUnifiedColor),
            effect: group.effect || 'none',
            effectSpeed: group.effectSpeed || 3,
            borderWidth: finiteNumber(group.borderWidth, 2),
            borderOpacity: group.borderOpacity ?? 0.65,
            cornerRadius: finiteNumber(group.cornerRadius, 8),
            shadowSize: Math.max(0, finiteNumber(group.shadowSize, 0)),
            shadowColor: group.shadowColor || DEFAULT_SHADOW_COLOR,
            contentPadding: group.contentPadding ?? DEFAULT_CONTENT_PADDING,
            headerBgColor: group.headerBgColor || DEFAULT_HEADER_BG_COLOR,
            backgroundFillEnabled: Boolean(group.backgroundFillEnabled),
            backgroundOpacity: Math.max(0.05, Math.min(0.95, finiteNumber(group.backgroundOpacity, DEFAULT_BACKGROUND_OPACITY))),
            titleColor: group.titleColor || '#FFD700',
            nativeGroupColor: resolveWorkspaceKitGroupNativeColor(group)
        };
    },

    saveDefaultStyle(group) {
        const style = this.groupStyleSnapshot(group);
        return this.saveStylePreset(this.readActivePreset(), style);
    },

    resetDefaultStyle() {
        return this.saveStylePreset(this.readActivePreset(), this.getBuiltInStyle());
    },

    uniqueGroupTitle(base = null, excludeId = null) {
        base = String(base || defaultGroupTitle());
        const used = new Set(
            Object.values(this.groups)
                .filter(group => group?.id !== excludeId)
                .map(group => String(group?.title || '').trim())
                .filter(Boolean)
        );
        if (!used.has(base)) return base;
        let index = 1;
        while (used.has(`${base}${index}`)) index += 1;
        return `${base}${index}`;
    },

    /* ── 自动收纳/释放节点 ── */
    syncNodeMembership(group, bounds) {
        const graph = app?.graph;
        if (!graph?._nodes) return;
        if (!bounds) return;

        if (!Array.isArray(group.nodeIds)) group.nodeIds = [];
        // T-037: 与原生一致——节点中心点落入编组即为成员（`containsCentre`），
        // 不再要求四边完全包含，也不再需要 20% 重叠防抖：中心点不会像面积比例
        // 那样在边缘抖动，保留防抖只会造成"拖出框仍黏着"。
        const inBounds = new Set();

        let changed = false;
        graph._nodes.forEach(n => {
            if (!n?.pos || typeof n.pos[0] !== 'number' || typeof n.pos[1] !== 'number') return;
            const nw = n.size?.[0] || 200, nh = n.size?.[1] || 100;
            if (typeof nw !== 'number' || typeof nh !== 'number') return;
            const nodeBounds = { x: n.pos[0], y: n.pos[1], w: nw, h: nh };
            if (isNodeInsideGroup(bounds, nodeBounds)) {
                inBounds.add(n.id);
                if (!this._idInArray(group.nodeIds, n.id)) {
                    group.nodeIds.push(n.id);
                    changed = true;
                }
            }
        });

        // T-037: 中心点判定是确定性的，因此移除了原先两道保护——"成员归零就
        // 清空"和"成员数骤降就跳过本轮"。它们本是为掩盖面积判定的抖动而加，
        // 保留下来会让节点在真正离开编组后仍留在成员名单里。
        const filtered = group.nodeIds.filter(nid => this._idInSet(inBounds, nid));
        if (filtered.length !== group.nodeIds.length) {
            group.nodeIds = filtered;
            changed = true;
        }
        if (changed) {
            this.syncGroupsToExtra();
        }
    },

    nodeVisualBounds(node) {
        const titleHeight = Number(window.LiteGraph?.NODE_TITLE_HEIGHT || 0) || 0;
        return resolveNodeVisualBounds({
            node,
            canvas: app?.canvas,
            documentRef: document,
            titleHeight,
        });
    },

    /* ── 计算包围盒 ── */
    calcBounds(nodeIds, options = {}) {
        const g = app?.graph;
        if (!g?._nodes) return null;
        let minX = 1/0, minY = 1/0, maxX = -1/0, maxY = -1/0, f = false;
        for (const nid of nodeIds) {
            const n = g._nodes.find(x => x.id === nid || x.id == nid);
            const rect = this.nodeVisualBounds(n);
            if (!rect) continue;
            minX = Math.min(minX, rect.x); minY = Math.min(minY, rect.y);
            maxX = Math.max(maxX, rect.x + rect.w); maxY = Math.max(maxY, rect.y + rect.h);
            f = true;
        }
        if (!f) return null;
        const style = { ...this.readDefaultStyle(), ...options };
        const p = Math.max(0, Number(style.contentPadding ?? DEFAULT_CONTENT_PADDING) || 0);
        const fs = style?.fontSize || 14;
        const headerHeight = Math.max(21, Math.round(fs * 1.8));
        const topPad = headerHeight + p;
        return { x: minX - p, y: minY - topPad, w: maxX - minX + p * 2, h: maxY - minY + topPad + p };
    },

    updateGroupBoundsFromMembers(group) {
        if (!group?.nodeIds?.length) return false;
        const bounds = this.calcBounds(group.nodeIds, {
            contentPadding: group.contentPadding ?? DEFAULT_CONTENT_PADDING,
            fontSize: group.fontSize || 14
        });
        if (!bounds) return false;
        group.bounds = bounds;
        this.updatePositions();
        app.graph?.setDirtyCanvas?.(true, true);
        return true;
    },

    previewGroupLayout(groupId, values = {}) {
        const group = this.groups[groupId];
        if (!group) return false;
        const previousPadding = group._previewContentPadding ?? group.contentPadding ?? DEFAULT_CONTENT_PADDING;
        if (!group?.bounds) return false;
        let bounds = null;
        if (values.contentPadding !== undefined) {
            const nextPadding = Math.max(0, Number(values.contentPadding) || 0);
            const delta = nextPadding - previousPadding;
            const base = group._previewBounds || group.bounds;
            bounds = {
                x: base.x - delta,
                y: base.y - delta,
                w: base.w + delta * 2,
                h: base.h + delta * 2
            };
            group._previewBounds = bounds;
            group._previewContentPadding = nextPadding;
            group.contentPadding = nextPadding;
        } else if (group?.nodeIds?.length) {
            Object.assign(group, values);
            bounds = this.calcBounds(group.nodeIds, {
                contentPadding: group.contentPadding ?? DEFAULT_CONTENT_PADDING,
                fontSize: group.fontSize || 14
            });
            if (!bounds) return false;
            group._previewBounds = bounds;
        }
        this.updatePositions();
        app.graph?.setDirtyCanvas?.(true, true);
        return true;
    },

    /* ── 创建编组 ── */
    async createGroupFromSelection(contextNode = null) {
        const c = app?.canvas;
        const sel = Object.values(c?.selected_nodes || {}).filter(n => n?.pos && typeof n.pos[0] === 'number');
        // A node context menu is useful even when LiteGraph has not placed the
        // right-clicked node in selected_nodes. In that case, create a
        // one-node group rather than showing a false "no selection" error.
        if (!sel.length && contextNode?.pos && typeof contextNode.pos[0] === 'number') {
            sel.push(contextNode);
        }
        if (!sel.length) {
            await this.showNotice(t('groups.noSelection'));
            return false;
        }

        const nids = sel.map(n => n.id);
        const style = this.readDefaultStyle();
        const bounds = this.calcBounds(nids, style) || { x: 0, y: 0, w: 300, h: 200 };

        // 找出完全位于新编组内部的旧编组（它们将成为子编组，大控制小）
        const childGroupIds = new Set();
        const newGroupArea = bounds.w * bounds.h;
        for (const [otherGid, otherG] of Object.entries(this.groups)) {
            const ob = otherG.bounds;
            if (!ob) continue;
            const otherArea = ob.w * ob.h;
            if (otherArea >= newGroupArea) continue; // 小不控制大
            if (this._isFullyContained(bounds, ob)) {
                childGroupIds.add(otherGid);
            }
        }

        // 新编组只收纳未被任何子编组包含的选中节点
        const self = this;
        const directNodeIds = nids.filter(nid => {
            const n = sel.find(x => self._idEq(x.id, nid));
            return !(n._xzgGroupId && self._idInSet(childGroupIds, n._xzgGroupId));
        });

        // 计算新编组将控制的所有节点（直接节点 + 子编组节点）
        const controlledNodeIds = new Set(directNodeIds);
        childGroupIds.forEach(cgId => this.groups[cgId]?.nodeIds.forEach(id => controlledNodeIds.add(id)));

        if (controlledNodeIds.size === 0) {
            console.log('[Workspace2 Canvas Groups] 没有可控制节点，跳过创建');
            return;
        }

        // 收集某个编组控制的所有节点（自身 + 完全位于内部的子编组，仅限面积更小的编组）
        const collectControlled = (gid) => {
            const g = this.groups[gid];
            if (!g) return new Set();
            const ids = new Set(g.nodeIds);
            const gArea = g.bounds.w * g.bounds.h;
            for (const [otherGid, otherG] of Object.entries(this.groups)) {
                if (otherGid === gid) continue;
                if (!otherG.bounds) continue;
                const otherArea = otherG.bounds.w * otherG.bounds.h;
                if (otherArea >= gArea) continue; // 小不控制大
                if (this._isFullyContained(g.bounds, otherG.bounds)) otherG.nodeIds.forEach(id => ids.add(id));
            }
            return ids;
        };

        // 防重复：已有编组控制相同节点集合且 bounds 高度重叠，则不再创建
        for (const [otherGid, otherG] of Object.entries(this.groups)) {
            const otherControlled = collectControlled(otherGid);
            if (otherControlled.size !== controlledNodeIds.size) continue;
            let allMatch = true;
            for (const id of controlledNodeIds) if (!otherControlled.has(id)) { allMatch = false; break; }
            if (!allMatch) continue;
            if (this._getIoU(bounds, otherG.bounds) > 0.9) {
                console.log('[Workspace2 Canvas Groups] 选中区域已存在等效编组，跳过创建:', otherGid);
                return;
            }
        }

        const gid = 'g_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        this.groups[gid] = {
            id: gid,
            title: this.uniqueGroupTitle(),
            nodeIds: directNodeIds,
            bypassed: false,
            bounds: bounds,
            ...style
        };

        // 标记节点归入新编组（同时保留节点在其他编组中的归属）
        directNodeIds.forEach(nid => {
            const n = sel.find(x => x.id === nid || x.id == nid);
            if (n) {
                n._xzgGroupId = gid;
            }
        });

        this.renderGroup(gid);
        app.graph?.setDirtyCanvas?.(true, true);
        app.graph?.change?.();
        this.syncGroupsToExtra();
        console.log('[Workspace2 Canvas Groups] 创建:', gid, directNodeIds.length, '直接节点', childGroupIds.size, '子编组');
    },

    createEmptyGroupAtContextPoint() {
        const canvas = app?.canvas?.canvas;
        const ds = app?.canvas?.ds;
        if (!canvas || !ds) return false;
        const rect = canvas.getBoundingClientRect();
        const scale = ds.scale || 1;
        const center = {
            x: (rect.width / 2) / scale - (ds.offset?.[0] || 0),
            y: (rect.height / 2) / scale - (ds.offset?.[1] || 0),
        };
        const recorded = this.lastCanvasContextPoint;
        const point = recorded && Number.isFinite(recorded.x) && Number.isFinite(recorded.y)
            ? recorded
            : center;
        const style = this.readDefaultStyle();
        const gid = 'g_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        this.groups[gid] = {
            id: gid,
            title: this.uniqueGroupTitle(),
            nodeIds: [],
            allowEmpty: true,
            bypassed: false,
            // Align the frame's top-left corner with the canvas context-menu
            // origin. This is the point the user sees, unlike a hidden center
            // offset that makes the new frame feel displaced.
            bounds: { x: point.x, y: point.y, w: 300, h: 200 },
            ...style,
        };
        this.renderGroup(gid);
        this.selectOnlyGroup(gid);
        app.graph?.setDirtyCanvas?.(true, true);
        app.graph?.change?.();
        this.syncGroupsToExtra();
        console.log('[Workspace2 Canvas Groups] 创建空白编组:', gid);
        return true;
    },

    killGroup(gid) {
        const el = this.groupEls[gid];
        if (el) {
            delete el._xzgRefs; // 清空缓存引用
            el.parentElement?.removeChild(el);
        }
        delete this.groupEls[gid];
        delete this.groups[gid];
        this.selectedGroupIds.delete(gid);
    },

    /* ── 渲染 ── */
    renderGroup(gid) {
        const g = this.groups[gid];
        if (!g) return;
        let el = this.groupEls[gid];
        if (!el) {
            el = this.buildGroupEl(g);
            this.groupEls[gid] = el;
            this.overlay.appendChild(el);
            // T-041: a freshly built frame carries the markup's default
            // `pointer-events`. Force the next frame to re-apply the current
            // pass-through state instead of early-returning as unchanged.
            this._hitRegionsPassThrough = null;
        }
        this.updateGroupStyle(gid);
    },

    buildGroupEl(group) {
        const self = this;
        const el = document.createElement('div');
        el.className = 'xzg-group-box';
        el.dataset.groupId = group.id;
        const bw = finiteNumber(group.borderWidth, 2);
        const bo = group.borderOpacity ?? 0.65;
        const cr = Math.max(0, finiteNumber(group.cornerRadius, 8));
        // Corner radius is applied only on the outer box. overflow:hidden clips the
        // header/body children to the border's inner edge, so they inherit a
        // concentric rounded corner automatically — no per-child radius math, and
        // the layers can never desync during a fast slider drag.
        el.style.cssText = `position:absolute;pointer-events:none;border:${bw}px solid hsla(48,100%,55%,${bo});border-radius:${cr}px;background:transparent;box-sizing:border-box;overflow:hidden;z-index:5;`;
        const fs = group.fontSize || 14;
        const showTitle = (group.title || '').trim() !== '';
        const headerHeight = Math.max(21, Math.round(fs * 1.8));
        el.innerHTML = `
            <div class="xzg-group-body" style="position:absolute;left:0;right:0;top:${headerHeight}px;bottom:0;background:transparent;border-radius:0;pointer-events:none;z-index:1;"></div>
            <div class="xzg-group-header" style="position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;padding:0 6px;background:${showTitle ? groupHeaderBackground(group) : 'transparent'};border-radius:0;cursor:pointer;user-select:none;pointer-events:auto;height:${headerHeight}px;box-sizing:border-box;overflow:hidden;z-index:4;">
                <div style="flex:1 1 auto;min-width:0;overflow:hidden;display:flex;align-items:center;gap:3px;height:100%;">
                    <button class="xzg-group-mode-btn xzg-group-rename-btn" data-group-action="rename" title="${t('groups.actionRename')}" aria-label="${t('groups.actionRename')}" style="width:19px;height:19px;border:none;border-radius:4px;background:transparent;color:${group.titleColor || '#FFD700'};cursor:pointer;padding:0;line-height:1;flex:0 0 auto;"><svg class="xzg-group-action-icon" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 16 3.2-.7L15.8 6.7a1.8 1.8 0 0 0-2.5-2.5l-8.6 8.6L4 16Z"/><path d="m11.8 5.7 2.5 2.5"/></svg></button>
                    <span class="xzg-group-title-text" style="color:${group.titleColor || '#FFD700'};font-size:${fs}px;font-weight:400;white-space:nowrap;line-height:1.4;overflow:hidden;text-overflow:ellipsis;${showTitle ? '' : 'display:none;'}">${showTitle ? group.title : ''}</span>
                </div>
                <div class="xzg-group-header-actions" style="display:flex;align-items:center;gap:3px;flex:0 0 auto;margin-left:4px;">
                    <button class="xzg-group-mode-btn xzg-group-queue-btn" data-group-action="queue" title="${t('groups.actionQueue')}" aria-label="${t('groups.actionQueue')}" style="width:19px;height:19px;border:none;border-radius:4px;background:transparent;color:${group.titleColor || '#FFD700'};cursor:pointer;padding:0;line-height:1;">
                        <svg class="xzg-group-action-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5.2 3.5 16.3 10 5.2 16.5Z" fill="currentColor"/></svg>
                    </button>
                    <button class="xzg-group-mode-btn" data-group-mode="bypass" title="${t('groups.actionBypass')}" aria-label="${t('groups.actionBypass')}" style="width:19px;height:19px;border:none;border-radius:4px;background:transparent;color:${group.titleColor || '#FFD700'};cursor:pointer;padding:0;line-height:1;">
                        <svg class="xzg-group-action-icon" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 10s2.7-4.5 7.6-4.5 7.6 4.5 7.6 4.5-2.7 4.5-7.6 4.5S2.4 10 2.4 10Z"/><circle cx="10" cy="10" r="2.15"/><path d="m4.1 4.1 11.8 11.8"/></svg>
                    </button>
                    <button class="xzg-group-mode-btn" data-group-mode="mute" title="${t('groups.actionMute')}" aria-label="${t('groups.actionMute')}" style="width:19px;height:19px;border:none;border-radius:4px;background:transparent;color:${group.titleColor || '#FFD700'};cursor:pointer;padding:0;line-height:1;">
                        <svg class="xzg-group-action-icon" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="10" cy="10" r="7.05"/><path d="m5 5 10 10"/></svg>
                    </button>
                    <button class="xzg-delete-btn" title="${t('groups.delete')}" style="border:none;background:none;cursor:pointer;padding:0;flex-shrink:0;font-size:18px;color:hsla(48,100%,55%,0.5);line-height:1;">×</button>
                </div>
            </div>
            <div class="xzg-border-left" style="position:absolute;left:0;top:${headerHeight}px;width:10px;bottom:0;pointer-events:auto;cursor:move;z-index:2;"></div>
            <div class="xzg-border-right" style="position:absolute;right:0;top:${headerHeight}px;width:10px;bottom:0;pointer-events:auto;cursor:move;z-index:2;"></div>
            <div class="xzg-border-bottom" style="position:absolute;left:7px;right:7px;bottom:0;height:10px;pointer-events:auto;cursor:move;z-index:2;"></div>
            <div class="xzg-resize-handle" data-resize-corner="se" title="${t('groups.resize')}" style="position:absolute;right:2px;bottom:2px;width:14px;height:14px;cursor:nwse-resize;pointer-events:none;opacity:0;transition:opacity 120ms ease;z-index:5;">
                <svg viewBox="0 0 14 14" width="14" height="14"><path d="M12 2L2 12 M8 12h4v-4" stroke="#FFD700" stroke-width="1.5" fill="none"/></svg>
            </div>
            <div class="xzg-resize-handle" data-resize-corner="nw" title="${t('groups.resize')}" style="position:absolute;left:2px;top:2px;width:14px;height:14px;cursor:nwse-resize;pointer-events:none;opacity:0;transition:opacity 120ms ease;z-index:5;">
                <svg viewBox="0 0 14 14" width="14" height="14"><path d="M2 12 12 2 M2 6v-4h4" stroke="#FFD700" stroke-width="1.5" fill="none"/></svg>
            </div>
            <div class="xzg-resize-handle" data-resize-corner="ne" title="${t('groups.resize')}" style="position:absolute;right:2px;top:2px;width:14px;height:14px;cursor:nesw-resize;pointer-events:none;opacity:0;transition:opacity 120ms ease;z-index:5;">
                <svg viewBox="0 0 14 14" width="14" height="14"><path d="M12 12 2 2 M8 2h4v4" stroke="#FFD700" stroke-width="1.5" fill="none"/></svg>
            </div>
            <div class="xzg-resize-handle" data-resize-corner="sw" title="${t('groups.resize')}" style="position:absolute;left:2px;bottom:2px;width:14px;height:14px;cursor:nesw-resize;pointer-events:none;opacity:0;transition:opacity 120ms ease;z-index:5;">
                <svg viewBox="0 0 14 14" width="14" height="14"><path d="M2 2 12 12 M2 8v4h4" stroke="#FFD700" stroke-width="1.5" fill="none"/></svg>
            </div>
        `;

        // 删除按钮
        el.querySelector('.xzg-delete-btn').addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
        el.querySelector('.xzg-delete-btn').addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); self.removeGroup(group.id); });

        // Explicit left-header rename action. Do not let it start a drag or
        // leak into the header's double-click content-selection path.
        const renameBtn = el.querySelector('.xzg-group-rename-btn');
        renameBtn.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
        renameBtn.addEventListener('dblclick', e => { e.stopPropagation(); e.preventDefault(); });
        renameBtn.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            const latest = self.groups[group.id] || group;
            const span = self.groupEls[latest.id]?.querySelector('.xzg-group-title-text');
            if (span) self.startRename(latest.id, span);
        });

        // 这两个按钮不复用旧的旁路逻辑：旧逻辑会在恢复时统一写入 MODE_ALWAYS，
        // 会丢失用户原先手动设置的节点模式。新逻辑保留逐节点快照后再恢复。
        el.querySelectorAll('.xzg-group-mode-btn[data-group-mode]').forEach(btn => {
            btn.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
            btn.addEventListener('dblclick', e => { e.stopPropagation(); e.preventDefault(); });
            btn.addEventListener('click', e => {
                e.stopPropagation();
                e.preventDefault();
                self.toggleGroupExecutionMode(group.id, btn.dataset.groupMode);
            });
        });
        const queueBtn = el.querySelector('.xzg-group-queue-btn');
        queueBtn.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
        queueBtn.addEventListener('dblclick', e => { e.stopPropagation(); e.preventDefault(); });
        queueBtn.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            self.queueGroupOutputNodes(group.id);
        });
        this.updateGroupModeButtons(group.id);

        // 将当前编组框提升到 overlay 最前面
        //
        // T-036: this must NOT re-append the element. Moving a node in the DOM
        // between mousedown and mouseup makes the browser abandon the click
        // sequence, so `click` and `dblclick` never fire at all — which silently
        // killed the header's double-click "select all contents" gesture (the
        // plan module was correct; its listener simply never ran).
        //
        // Raising z-index achieves the same stacking without touching the tree.
        // The counter is monotonic so the most recently touched frame always
        // wins; siblings keep the markup's base value of 5.
        const bringToFront = () => {
            self.activeGroupId = group.id;
            self._frontZ = (self._frontZ || 5) + 1;
            el.style.zIndex = String(self._frontZ);
        };

        // 边框点击：提升层级并启动拖动（便于选中重叠在下层的编组框）
        ['xzg-border-left', 'xzg-border-right', 'xzg-border-bottom'].forEach(cls => {
            const borderEl = el.querySelector('.' + cls);
            if (!borderEl) return;
            borderEl.addEventListener('mousedown', e => {
                // 鼠标中键 → 透传到画布以支持画布平移
                if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    const el2 = e.currentTarget;
                    el2.style.pointerEvents = 'none';
                    self._dispatchMiddleDown(e.clientX, e.clientY);
                    const restore = () => {
                        el2.style.pointerEvents = 'auto';
                        // T-041 owns this strip's pointer-events; re-assert the
                        // current state on the next frame rather than assuming
                        // 'auto' is still correct.
                        self._hitRegionsPassThrough = null;
                        document.removeEventListener('mouseup', restore);
                    };
                    document.addEventListener('mouseup', restore);
                    return;
                }
                if (e.button !== 0) return;
                e.preventDefault(); e.stopPropagation();
                bringToFront();
                self.prepareGroupDrag(group.id);
                self.startDrag(group.id, e);
            });
            // 边框区域拦截了滚轮事件，需转发到画布以支持缩放
            borderEl.addEventListener('wheel', e => {
                e.preventDefault();
                const cv = app?.canvas;
                if (!cv?.ds) return;
                const d = e.deltaY > 0 ? -1 : 1;
                const ns = cv.ds.scale * (1 + d * 0.1);
                if (ns < 0.1 || ns > 10) return;
                const rc = cv.canvas.getBoundingClientRect();
                cv.ds.changeScale(ns, [e.clientX - rc.left, e.clientY - rc.top]);
                cv.setDirty(true, true);
            }, { passive: false });
        });

        // 标题栏操作：左键按住拖动，右键打开设置。单击不再切换绕过，避免误触发。
        const headerEl = el.querySelector('.xzg-group-header');
        headerEl.addEventListener('mousedown', e => {
            // 鼠标中键 → 透传到画布以支持画布平移
            if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
                const el2 = e.currentTarget;
                el2.style.pointerEvents = 'none';
                self._dispatchMiddleDown(e.clientX, e.clientY);
                const restore = () => {
                    el2.style.pointerEvents = 'auto';
                    document.removeEventListener('mouseup', restore);
                };
                document.addEventListener('mouseup', restore);
                return;
            }
            if (e.target.tagName === 'BUTTON') return;
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            bringToFront();
            // T-036: a plain click on a frame that is not already selected
            // replaces the whole selection — including ComfyUI's native node
            // selection.  Without this the header inherited whatever nodes the
            // user had clicked earlier elsewhere on the canvas, and `startDrag`
            // took its multi-drag branch and carried them along.
            const plan = resolveHeaderClickSelection({
                hasModifier: hasSelectionModifier(e),
                isAlreadySelected: self.selectedGroupIds.has(group.id),
            });
            if (plan === HEADER_CLICK_SELECTION.RESET) {
                app?.canvas?.deselectAllNodes?.();
                self.selectOnlyGroup(group.id);
            }
            self.prepareGroupDrag(group.id);
            self.startDrag(group.id, e);
        });

        headerEl.addEventListener('dblclick', e => {
            if (e.target.closest('button')) return;
            e.preventDefault();
            e.stopPropagation();
            self.selectGroupContents(group.id);
        });

        // 右键标题栏任意位置 → 设置（排除删除按钮）
        headerEl.addEventListener('contextmenu', e => {
            if (e.target.closest('button')) return;
            e.preventDefault(); e.stopPropagation();
            self.openSettings(self.groups[group.id] || group);
        });
        // 滚轮缩放
        headerEl.addEventListener('wheel', e => {
            e.preventDefault(); e.stopPropagation();
            const cv = app?.canvas;
            if (!cv?.ds) return;
            const d = e.deltaY > 0 ? -1 : 1;
            const ns = cv.ds.scale * (1 + d * 0.1);
            if (ns < 0.1 || ns > 10) return;
            const rc = cv.canvas.getBoundingClientRect();
            cv.ds.changeScale(ns, [e.clientX - rc.left, e.clientY - rc.top]);
            cv.setDirty(true, true);
        });

        // 调整大小手柄
        el.querySelectorAll('.xzg-resize-handle').forEach((resizeHandle) => resizeHandle.addEventListener('mousedown', e => {
            // 鼠标中键 → 透传到画布以支持画布平移
            if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
                const el2 = e.currentTarget;
                el2.style.pointerEvents = 'none';
                self._dispatchMiddleDown(e.clientX, e.clientY);
                const restore = () => {
                    el2.style.pointerEvents = 'auto';
                    // T-041 owns this handle's pointer-events; re-assert on the
                    // next frame rather than assuming 'auto' is still correct.
                    self._hitRegionsPassThrough = null;
                    document.removeEventListener('mouseup', restore);
                };
                document.addEventListener('mouseup', restore);
                return;
            }
            e.stopPropagation(); e.preventDefault();
            self.activeGroupId = group.id;
            self.startResize(group.id, e, resizeHandle.dataset.resizeCorner || 'se');
        }));
        el.querySelectorAll('.xzg-resize-handle').forEach((resizeHandle) => resizeHandle.addEventListener('wheel', e => {
            e.preventDefault();
            const cv = app?.canvas;
            if (!cv?.ds) return;
            const d = e.deltaY > 0 ? -1 : 1;
            const ns = cv.ds.scale * (1 + d * 0.1);
            if (ns < 0.1 || ns > 10) return;
            const rc = cv.canvas.getBoundingClientRect();
            cv.ds.changeScale(ns, [e.clientX - rc.left, e.clientY - rc.top]);
            cv.setDirty(true, true);
        }, { passive: false }));

        return el;
    },

    // HSL ↔ Hex 转换
    hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))); };
        return '#' + [0,8,4].map(n => f(n).toString(16).padStart(2,'0')).join('');
    },
    hexToHsl(hex) {
        let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
        const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
        let h = 0, s = 0, l = (mx + mn) / 2;
        if (mx !== mn) {
            const d = mx - mn;
            s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
            if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (mx === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h = Math.round(h * 60);
        }
        return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
    },

    /* ── 设置弹窗 ── */
    openSettings(group) {
        const self = this;
        group = this.groups[group.id] || group;
        const gid = group.id;

        // Save a cancel snapshot before live preview starts.  A successful
        // Apply to All becomes a new committed baseline, so this object is
        // deliberately mutable and can be rebased after that operation.
        const captureSnapshot = target => ({
            title: target.title,
            fontSize: target.fontSize,
            titleColor: target.titleColor,
            nativeGroupColor: target.nativeGroupColor,
            headerBgColor: target.headerBgColor,
            backgroundFillEnabled: Boolean(target.backgroundFillEnabled),
            backgroundOpacity: target.backgroundOpacity,
            colorHue: target.colorHue, colorSat: target.colorSat, colorLit: target.colorLit,
            useUnifiedColor: Boolean(target.useUnifiedColor),
            effect: target.effect, effectSpeed: target.effectSpeed,
            borderWidth: target.borderWidth, borderOpacity: target.borderOpacity,
            cornerRadius: target.cornerRadius,
            shadowSize: target.shadowSize,
            shadowColor: target.shadowColor,
            contentPadding: target.contentPadding,
            bounds: target.bounds ? { ...target.bounds } : null
        });
        const _snapshot = captureSnapshot(group);
        const rebaseCancelSnapshot = () => Object.assign(_snapshot, captureSnapshot(group));
        const revertSnapshot = () => {
            Object.assign(group, {
                title: _snapshot.title,
                fontSize: _snapshot.fontSize,
                titleColor: _snapshot.titleColor,
                nativeGroupColor: _snapshot.nativeGroupColor,
                headerBgColor: _snapshot.headerBgColor,
                backgroundFillEnabled: _snapshot.backgroundFillEnabled,
                backgroundOpacity: _snapshot.backgroundOpacity,
                colorHue: _snapshot.colorHue, colorSat: _snapshot.colorSat, colorLit: _snapshot.colorLit,
                useUnifiedColor: _snapshot.useUnifiedColor,
                effect: _snapshot.effect, effectSpeed: _snapshot.effectSpeed,
                borderWidth: _snapshot.borderWidth, borderOpacity: _snapshot.borderOpacity,
                cornerRadius: _snapshot.cornerRadius,
                shadowSize: _snapshot.shadowSize,
                shadowColor: _snapshot.shadowColor,
                contentPadding: _snapshot.contentPadding,
                bounds: _snapshot.bounds ? { ..._snapshot.bounds } : group.bounds
            });
            delete group._previewBounds;
            delete group._previewContentPadding;
            // 重建 DOM 恢复视觉状态
            this.rebuildGroupEl(group);
            this.syncGroupsToExtra();
            this.writeGroupDataToNodes();
            app.graph?.setDirtyCanvas?.(true, true);
        };

        // 移除已有弹窗
        const old = document.querySelector('.xzg-settings-modal');
        if (old) old.remove();

        ensureWorkspaceKitDialogStyles();
        const modal = document.createElement('div');
        modal.className = 'xzg-settings-modal workspacekit-dialog';
        // Keep one label column for both Chinese and English.  The earlier
        // 52px column was sized only for Chinese and let English labels run
        // underneath their sliders.
        modal.style.cssText = `position:fixed;left:0;top:0;background:var(--workspacekit-dialog-bg, #1e1e1e);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:0 12px 12px;z-index:9999;width:min(370px,calc(100vw - 20px));max-width:calc(100vw - 20px);max-height:calc(100vh - 20px);overflow-y:auto;box-sizing:border-box;box-shadow:0 0 20px rgba(0,0,0,0.8);visibility:hidden;`;
        const curH = group.colorHue || 48, curS = group.colorSat ?? 100, curL = group.colorLit ?? 55;
        const activePresetSnapshot = this.readActivePreset();
        let activePresetIndex = activePresetSnapshot;

        const curKey = this.shortcutKey || 'g';
        const initRgba = group.headerBgColor || DEFAULT_HEADER_BG_COLOR;
        const initAlpha = Math.max(MIN_HEADER_OPACITY, Math.min(MAX_HEADER_OPACITY, parseFloat(initRgba.replace(/^rgba?\([\d,.\s]+,\s*([\d.]+)\)$/,'$1')) || DEFAULT_HEADER_OPACITY));
        const initHex = (() => {
            const m = initRgba.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
            if (m) return '#' + [m[1],m[2],m[3]].map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
            return '#000000';
        })();
        modal.innerHTML = `
            <div class="xzg-modal-drag-handle" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0 8px 0;margin-bottom:12px;cursor:move;user-select:none;">
                <span class="workspacekit-dialog-header" style="color:#fff;font-size:16px;font-weight:600;">${t('groups.settingsTitle')}</span>
                <input class="xzg-set-shortcut" value="g" type="hidden">
            </div>
            <div style="margin-bottom:12px;">
                <label class="workspacekit-dialog-section" style="color:#ff8c00;font-size:14px;display:block;margin-bottom:8px;font-weight:600;">${t('groups.headerSettings')}</label>
                <div style="display:flex;align-items:center;gap:6px;height:28px;margin-bottom:8px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.name')}</label>
                    <input class="xzg-set-title" value="${group.title}" style="flex:1;height:28px;padding:0 8px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#fff;font-size:12px;box-sizing:border-box;">
                </div>
                <div style="display:flex;align-items:center;gap:6px;height:28px;margin-bottom:2px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.fontSize')}</label>
                    <input class="xzg-set-fontsize" type="range" min="6" max="48" value="${group.fontSize || 14}" style="flex:1;height:28px;margin:0;">
                    <div style="width:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;gap:5px;height:28px;">
                        <span class="xzg-set-fs-val" style="color:#fff;font-size:12px;width:22px;text-align:left;">${group.fontSize || 14}</span>
                        <div class="xzg-title-color-swatch" style="width:18px;height:18px;border-radius:4px;cursor:pointer;background:${group.titleColor || '#FFD700'};border:1px solid rgba(255,255,255,0.2);flex-shrink:0;"></div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;min-height:22px;margin-bottom:8px;">
                    <label style="color:#fff;opacity:0.6;font-size:11px;display:flex;align-items:center;gap:5px;cursor:pointer;"><input class="xzg-set-unified-color" type="checkbox" ${group.useUnifiedColor ? 'checked' : ''} style="margin:0;flex:0 0 auto;"><span>${t('groups.unifyFontBorderColor')}</span></label>
                </div>
                <div style="display:flex;align-items:center;gap:6px;height:28px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.headerOpacity')}</label>
                    <input class="xzg-set-headeropacity" type="range" min="5" max="50" value="${Math.max(5, Math.min(50, Math.round(initAlpha * 100)))}" style="flex:1;height:28px;margin:0;">
                    <div style="width:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;gap:5px;height:28px;">
                        <span class="xzg-header-opacity-val" style="color:#fff;font-size:12px;width:22px;text-align:left;">${Math.max(5, Math.min(50, Math.round(initAlpha * 100)))}%</span>
                        <div class="xzg-header-color-swatch" style="width:18px;height:18px;border-radius:4px;cursor:pointer;background:${initHex};border:1px solid rgba(255,255,255,0.2);flex-shrink:0;"></div>
                        <input class="xzg-set-headerbgcolor" type="color" value="${initHex}" style="position:absolute;width:0;height:0;opacity:0;padding:0;border:0;">
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;min-height:28px;margin-top:8px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;display:flex;align-items:center;gap:5px;cursor:pointer;"><input class="xzg-set-background-fill" type="checkbox" ${group.backgroundFillEnabled ? 'checked' : ''} style="margin:0;flex:0 0 auto;"><span>${t('groups.backgroundFill')}</span></label>
                    <div class="xzg-background-swatches" style="flex:1;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                        ${this.readColorPresets().map(sw => {
                            const copyValue = clipboardValueForPreset(sw);
                            const hint = presetCopiesNativeName(sw)
                                ? t('groups.colorPresetCopyName', { value: copyValue })
                                : t('groups.colorPresetCopyHex', { value: copyValue });
                            return `<button type="button" class="xzg-bg-swatch" data-color="${sw.hex}" data-copy="${copyValue}" title="${hint}" aria-label="${t('groups.colorPreset')} ${sw.key} — ${hint}" style="width:18px;height:18px;padding:0;border-radius:4px;cursor:pointer;background:${displayColorForNativeHex(sw.hex) || sw.hex};border:1px solid rgba(255,255,255,0.2);flex-shrink:0;"></button>`;
                        }).join('')}
                    </div>
                </div>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.1);margin-bottom:12px;padding-top:0;"></div>
            <div style="margin-bottom:12px;">
                <label class="workspacekit-dialog-section" style="color:#ff8c00;font-size:14px;display:block;margin-bottom:8px;font-weight:600;">${t('groups.borderSettings')}</label>
                <div style="display:flex;align-items:center;gap:6px;height:28px;margin-bottom:8px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.opacity')}</label>
                    <input class="xzg-set-borderopacity" type="range" min="5" max="100" value="${Math.round((group.borderOpacity??0.65)*100)}" style="flex:1;height:28px;margin:0;">
                    <div style="width:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;gap:5px;height:28px;">
                        <span class="xzg-set-bo-val" style="color:#fff;font-size:12px;width:22px;text-align:left;">${Math.round((group.borderOpacity??0.65)*100)}%</span>
                        <div class="xzg-custom-color-trigger" style="width:18px;height:18px;border-radius:4px;cursor:pointer;background:${this.hslToHex(curH, curS, curL)};border:1px solid rgba(255,255,255,0.2);flex-shrink:0;"></div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;height:28px;margin-bottom:8px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.shadow')}</label>
                    <input class="xzg-set-shadowsize" type="range" min="0" max="40" value="${Math.max(0, finiteNumber(group.shadowSize, 0))}" style="flex:1;height:28px;margin:0;">
                    <div style="width:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;gap:5px;height:28px;">
                        <span class="xzg-set-shadow-val" style="color:#fff;font-size:12px;width:22px;text-align:left;">${Math.max(0, finiteNumber(group.shadowSize, 0))}px</span>
                        <div class="xzg-shadow-color-swatch" style="width:18px;height:18px;border-radius:4px;cursor:pointer;background:${group.shadowColor || DEFAULT_SHADOW_COLOR};border:1px solid rgba(255,255,255,0.2);flex-shrink:0;"></div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;height:28px;margin-bottom:8px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.borderWidth')}</label>
                    <input class="xzg-set-borderwidth" type="range" min="0" max="5" value="${finiteNumber(group.borderWidth, 2)}" style="flex:1;height:28px;margin:0;">
                    <div style="width:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;height:28px;">
                        <span class="xzg-set-bw-val" style="color:#fff;font-size:12px;text-align:left;">${finiteNumber(group.borderWidth, 2)}px</span>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;height:28px;margin-bottom:8px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.cornerRadius')}</label>
                    <input class="xzg-set-cornerradius" type="range" min="0" max="20" value="${Math.min(20, Math.max(0, finiteNumber(group.cornerRadius, 8)))}" style="flex:1;height:28px;margin:0;">
                    <div style="width:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;height:28px;">
                        <span class="xzg-set-cr-val" style="color:#fff;font-size:12px;text-align:left;">${Math.min(20, Math.max(0, finiteNumber(group.cornerRadius, 8)))}px</span>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;height:28px;margin-bottom:8px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.padding')}</label>
                    <input class="xzg-set-contentpadding" type="range" min="0" max="80" value="${group.contentPadding ?? DEFAULT_CONTENT_PADDING}" style="flex:1;height:28px;margin:0;">
                    <div style="width:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;height:28px;">
                        <span class="xzg-set-cp-val" style="color:#fff;font-size:12px;text-align:left;">${group.contentPadding ?? DEFAULT_CONTENT_PADDING}px</span>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;height:28px;margin-bottom:8px;">
                    <label style="color:#fff;font-size:12px;flex:0 0 96px;white-space:nowrap;">${t('groups.animation')}</label>
                    <div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;height:28px;">
                        <select class="xzg-set-effect" style="width:92px;min-width:92px;max-width:92px;flex:0 0 92px;height:28px;padding:0 6px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#fff;font-size:12px;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            <option value="none" ${!group.effect||group.effect==='none'?'selected':''}>${t('groups.effect.none')}</option>
                            <option value="rainbow" ${group.effect==='rainbow'?'selected':''}>${t('groups.effect.rainbow')}</option>
                            <option value="pulse" ${group.effect==='pulse'?'selected':''}>${t('groups.effect.pulse')}</option>
                            <option value="glow" ${group.effect==='glow'?'selected':''}>${t('groups.effect.glow')}</option>
                        </select>
                        <input class="xzg-set-speed" type="range" min="1" max="10" value="${group.effectSpeed||3}" style="flex:1;min-width:64px;height:28px;margin:0;">
                    </div>
                    <div style="width:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-start;height:28px;">
                        <span class="xzg-set-spd-val" style="color:#fff;font-size:12px;text-align:left;">${group.effectSpeed||3}X</span>
                    </div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.12);">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                        <span style="color:#bbb;font-size:12px;white-space:nowrap;margin-right:2px;">${t('groups.preset')}</span>
                        <button class="xzg-preset-btn" data-preset="0" type="button" style="height:26px;width:28px;background:#333;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#ddd;cursor:pointer;font-size:12px;padding:0;">1</button>
                        <button class="xzg-preset-btn" data-preset="1" type="button" style="height:26px;width:28px;background:#333;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#ddd;cursor:pointer;font-size:12px;padding:0;">2</button>
                        <button class="xzg-preset-btn" data-preset="2" type="button" style="height:26px;width:28px;background:#333;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#ddd;cursor:pointer;font-size:12px;padding:0;">3</button>
                        <button class="xzg-preset-btn" data-preset="3" type="button" style="height:26px;width:28px;background:#333;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#ddd;cursor:pointer;font-size:12px;padding:0;">4</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                        <button class="xzg-save-preset" type="button" style="height:26px;padding:0 8px;background:#333;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#ddd;cursor:pointer;font-size:11px;white-space:nowrap;" title="${t('groups.savePresetTooltip')}">${t('groups.savePreset')}</button>
                        <button class="xzg-reset-default" type="button" style="height:26px;width:22px;background:#333;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#ddd;cursor:pointer;font-size:14px;line-height:1;padding:0;" title="${t('groups.restorePreset')}">↺</button>
                    </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);">
                    <button class="xzg-set-apply-all" type="button" style="height:28px;padding:0 10px;background:#333;border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#ddd;cursor:pointer;font-size:12px;white-space:nowrap;" title="${t('groups.applyAllTooltip')}">${t('groups.applyAll')}</button>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button class="xzg-set-cancel" type="button" style="height:28px;min-width:58px;padding:0 10px;background:#333;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#fff;cursor:pointer;font-size:12px;">${t('groups.cancel')}</button>
                        <button class="xzg-set-apply" type="button" style="height:28px;min-width:58px;padding:0 10px;background:#0a84ff;border:1px solid rgba(90,200,250,0.85);border-radius:4px;color:#fff;cursor:pointer;font-size:12px;">${t('groups.apply')}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const clampPosition = () => {
            const r = modal.getBoundingClientRect();
            const maxLeft = window.innerWidth - r.width - 10;
            const maxTop = window.innerHeight - r.height - 10;
            let left = parseFloat(modal.style.left) || 0;
            let top = parseFloat(modal.style.top) || 0;
            left = Math.max(10, Math.min(left, maxLeft));
            top = Math.max(10, Math.min(top, maxTop));
            modal.style.left = left + 'px';
            modal.style.top = top + 'px';
        };

        (function makeDraggable(el, handle) {
            let ox, oy, moving = false;
            handle.addEventListener('mousedown', e => {
                if (e.button !== 0) return;
                if (e.target.closest('input, button, select')) return;
                e.preventDefault();
                const r = el.getBoundingClientRect();
                ox = e.clientX - r.left;
                oy = e.clientY - r.top;
                moving = true;
                const onMove = ev => {
                    if (!moving) return;
                    const maxLeft = window.innerWidth - r.width - 10;
                    const maxTop = window.innerHeight - r.height - 10;
                    let nx = ev.clientX - ox;
                    let ny = ev.clientY - oy;
                    nx = Math.max(10, Math.min(nx, maxLeft));
                    ny = Math.max(10, Math.min(ny, maxTop));
                    el.style.left = nx + 'px';
                    el.style.top = ny + 'px';
                };
                const onUp = () => {
                    moving = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        })(modal, modal.querySelector('.xzg-modal-drag-handle'));

        const initLeft = Math.max(10, window.innerWidth - modal.offsetWidth - 20);
        const initTop = Math.max(10, (window.innerHeight - modal.offsetHeight) / 2);
        modal.style.left = initLeft + 'px';
        modal.style.top = initTop + 'px';
        modal.style.visibility = 'visible';
        clampPosition();

        // 边框动画下拉（实时预览）
        const effectSel = modal.querySelector('.xzg-set-effect');
        effectSel.addEventListener('change', () => {
            group.effect = effectSel.value;
            self.updateGroupStyle(group.id);
        });

        // 速度滑块
        const spdR = modal.querySelector('.xzg-set-speed');
        const spdV = modal.querySelector('.xzg-set-spd-val');
        spdR.addEventListener('input', () => {
            spdV.textContent = `${spdR.value}X`;
            group.effectSpeed = parseInt(spdR.value) || 3;
            self.updateGroupStyle(group.id);
        });

        // 边框粗细滑块（实时预览）
        const bwR = modal.querySelector('.xzg-set-borderwidth');
        const bwV = modal.querySelector('.xzg-set-bw-val');
        bwR.addEventListener('input', () => {
            bwV.textContent = bwR.value;
            group.borderWidth = finiteNumber(bwR.value, 2);
            self.updateGroupStyle(group.id);
        });

        // 圆角滑块（实时预览）
        const crR = modal.querySelector('.xzg-set-cornerradius');
        const crV = modal.querySelector('.xzg-set-cr-val');
        crR.addEventListener('input', () => {
            const v = Math.min(20, Math.max(0, finiteNumber(crR.value, 8)));
            crV.textContent = `${v}px`;
            group.cornerRadius = v;
            self.updateGroupStyle(group.id);
            // Body fill is drawn in onDrawBackground; force a canvas redraw in the
            // same tick so it never lags the DOM border during a fast drag.
            app.graph?.setDirtyCanvas?.(true, true);
        });

        // 边框阴影滑块（实时预览）
        const shadowR = modal.querySelector('.xzg-set-shadowsize');
        const shadowV = modal.querySelector('.xzg-set-shadow-val');
        shadowR.addEventListener('input', () => {
            const v = Math.max(0, finiteNumber(shadowR.value, 0));
            shadowV.textContent = `${v}px`;
            group.shadowSize = v;
            self.updateGroupStyle(group.id);
        });

        // 边框透明度滑块（实时预览）
        const boR = modal.querySelector('.xzg-set-borderopacity');
        const boV = modal.querySelector('.xzg-set-bo-val');
        boR.addEventListener('input', () => {
            boV.textContent = boR.value;
            group.borderOpacity = (parseInt(boR.value) || 65) / 100;
            self.updateGroupStyle(group.id);
        });

        // 节点边距滑块（实时重算边界）
        const cpR = modal.querySelector('.xzg-set-contentpadding');
        const cpV = modal.querySelector('.xzg-set-cp-val');
        cpR.addEventListener('input', () => {
            const v = Math.max(0, parseInt(cpR.value) || 0);
            cpV.textContent = `${v}px`;
            self.previewGroupLayout(group.id, { contentPadding: v });
        });

        // 标题大小滑块
        const fsR = modal.querySelector('.xzg-set-fontsize');
        const fsV = modal.querySelector('.xzg-set-fs-val');
        fsR.addEventListener('input', () => {
            const v = parseInt(fsR.value) || 14;
            fsV.textContent = v;
            group.fontSize = v;
            const span = self.groupEls[group.id]?.querySelector('.xzg-group-title-text');
            if (span) span.style.fontSize = v + 'px';
            self.previewGroupLayout(group.id, { fontSize: v });
        });

        // 文字颜色 - 隐藏颜色选择器
        const titleColorPicker = document.createElement('input');
        titleColorPicker.type = 'color';
        titleColorPicker.value = group.titleColor || '#FFD700';
        titleColorPicker.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;padding:0;border:0;opacity:0;';
        modal.appendChild(titleColorPicker);
        const titleColorSwatch = modal.querySelector('.xzg-title-color-swatch');
        if (titleColorSwatch) {
            // Font color is always editable now (it is the unified entry point too).
            titleColorSwatch.addEventListener('click', () => titleColorPicker.click());
        }
        titleColorPicker.addEventListener('input', () => {
            const c = titleColorPicker.value;
            titleColorSwatch.style.background = c;
            group.titleColor = c;
            const span = self.groupEls[group.id]?.querySelector('.xzg-group-title-text');
            if (span) span.style.color = c;
            // T-210c: when unified, the font color also drives the border color
            // (borderOpacity untouched); when not unified, border data is left alone.
            if (group.useUnifiedColor) syncBorderColorFromTitle();
        });

        // 阴影颜色 - 隐藏颜色选择器
        const shadowColorPicker = document.createElement('input');
        shadowColorPicker.type = 'color';
        shadowColorPicker.value = group.shadowColor || DEFAULT_SHADOW_COLOR;
        shadowColorPicker.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;padding:0;border:0;opacity:0;';
        modal.appendChild(shadowColorPicker);
        const shadowColorSwatch = modal.querySelector('.xzg-shadow-color-swatch');
        if (shadowColorSwatch) {
            shadowColorSwatch.addEventListener('click', () => shadowColorPicker.click());
        }
        shadowColorPicker.addEventListener('input', () => {
            const c = shadowColorPicker.value;
            if (shadowColorSwatch) shadowColorSwatch.style.background = c;
            group.shadowColor = c;
            self.updateGroupStyle(group.id);
        });

        // 隐藏颜色选择器（边框自定义颜色）
        let sel = { h: curH, s: curS, l: curL };
        const hiddenPicker = document.createElement('input');
        hiddenPicker.type = 'color';
        hiddenPicker.value = this.hslToHex(curH, curS, curL);
        hiddenPicker.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;padding:0;border:0;opacity:0;';
        modal.appendChild(hiddenPicker);
        const colorTrigger = modal.querySelector('.xzg-custom-color-trigger');
        const unifiedToggle = modal.querySelector('.xzg-set-unified-color');

        const syncColorFromHSL = (h, s, l) => {
            sel = { h, s, l };
            hiddenPicker.value = this.hslToHex(h, s, l);
            if (colorTrigger) colorTrigger.style.background = hiddenPicker.value;
            // 实时预览到编组框体
            group.colorHue = h;
            group.colorSat = s;
            group.colorLit = l;
            this.updateGroupStyle(group.id);
        };
        syncColorFromHSL(curH, curS, curL);

        // T-210c (2026-07-29): when unified, the font-color control is the single
        // color entry. It drives titleColor AND the border HSL (colorHue/Sat/Lit),
        // but never touches borderOpacity. Border color data is only written while
        // unified is on; turning it off stops the sync and leaves border HSL intact.
        const syncBorderColorFromTitle = () => {
            const hsl = this.hexToHsl(titleColorPicker.value);
            syncColorFromHSL(hsl.h, hsl.s, hsl.l);
        };

        // 七彩条点击→弹出系统颜色选择器（统一时禁用，颜色由字体颜色驱动）
        if (colorTrigger) {
            colorTrigger.addEventListener('click', () => {
                if (!group.useUnifiedColor) hiddenPicker.click();
            });
        }

        // 选色后更新（边框自定义颜色，仅在非统一态可用）
        hiddenPicker.addEventListener('input', () => {
            const hsl = this.hexToHsl(hiddenPicker.value);
            syncColorFromHSL(hsl.h, hsl.s, hsl.l);
        });

        const setUnifiedUiState = (enabled) => {
            // The border custom-color trigger is disabled while unified: the font
            // color owns the border color. Show a clear "locked" affordance.
            if (colorTrigger) {
                colorTrigger.style.display = 'inline-flex';
                colorTrigger.style.alignItems = 'center';
                colorTrigger.style.justifyContent = 'center';
                colorTrigger.style.cursor = enabled ? 'not-allowed' : 'pointer';
                colorTrigger.style.border = enabled ? '1.5px solid #ff5d5d' : '1px solid rgba(255,255,255,0.2)';
                colorTrigger.style.color = enabled ? '#ff5d5d' : '';
                colorTrigger.style.fontSize = enabled ? '16px' : '';
                colorTrigger.style.fontWeight = enabled ? '700' : '';
                colorTrigger.style.lineHeight = '1';
                colorTrigger.textContent = enabled ? '×' : '';
                colorTrigger.style.background = enabled ? 'transparent' : hiddenPicker.value;
            }
        };
        unifiedToggle.addEventListener('change', () => {
            group.useUnifiedColor = unifiedToggle.checked;
            setUnifiedUiState(group.useUnifiedColor);
            // Turning it on immediately unifies the border to the current font
            // color; turning it off changes nothing else (border HSL preserved).
            if (group.useUnifiedColor) syncBorderColorFromTitle();
        });
        setUnifiedUiState(Boolean(group.useUnifiedColor));

        // 标题栏背景色 - 颜色选择器已在 HTML 中
        const headerColorPicker = modal.querySelector('.xzg-set-headerbgcolor');
        const headerColorSwatch = modal.querySelector('.xzg-header-color-swatch');
        const headerOpacitySlider = modal.querySelector('.xzg-set-headeropacity');
        const headerOpacityVal = modal.querySelector('.xzg-header-opacity-val');
        const backgroundFillToggle = modal.querySelector('.xzg-set-background-fill');
        const bgSwatchButtons = Array.from(modal.querySelectorAll('.xzg-bg-swatch'));
        let headerAlpha = initAlpha;

        // 缓存 header 元素引用
        const groupEl = this.groupEls[group.id];
        const headerEl = groupEl ? groupEl.querySelector('.xzg-group-header') : null;

        // The swatches use the current LiteGraph `groupcolor` palette.  Compare
        // the persisted compatibility hex directly; a custom colour highlights
        // nothing unless it is exactly one of the current native colours.
        const refreshBgSwatchSelection = () => {
            const hex = normalizeHexColor(headerColorPicker.value);
            for (const btn of bgSwatchButtons) {
                const match = hex === normalizeHexColor(btn.dataset.color);
                btn.style.outline = match ? '2px solid var(--p-primary-color, #0a84ff)' : 'none';
                btn.style.outlineOffset = match ? '1px' : '0';
            }
        };

        // T-210b: the body fill follows the title bar. Whenever the title-bar
        // color/opacity changes we re-derive the body via groupBodyBackground().
        const refreshBodyFillPreview = () => {
            self.updateGroupStyle(group.id);
        };

        const updateHeaderBg = () => {
            const hex = headerColorPicker.value;
            const r = parseInt(hex.slice(1,3),16);
            const g = parseInt(hex.slice(3,5),16);
            const b = parseInt(hex.slice(5,7),16);
            // Stored: the untouched native RGB, so rgthree's colour filter and
            // native conversion keep matching. Painted: the display form.
            const rgba = `rgba(${r},${g},${b},${headerAlpha})`;
            group.headerBgColor = rgba;
            group.nativeGroupColor = normalizeHexColor(hex);
            const displayHex = displayColorForNativeHex(hex) || hex;
            if (headerColorSwatch) headerColorSwatch.style.background = displayHex;
            if (headerEl) headerEl.style.background = groupHeaderBackground(group);
            refreshBgSwatchSelection();
            refreshBodyFillPreview();
            self.updatePositions();
        };

        if (headerColorSwatch) {
            headerColorSwatch.addEventListener('click', () => headerColorPicker.click());
        }
        headerColorPicker.addEventListener('input', updateHeaderBg);
        headerColorPicker.addEventListener('change', updateHeaderBg);

        // 透明度滑块：标题栏透明度改变时，背景透明度按 50% 自动跟随（派生，无独立滑块）
        headerOpacitySlider.addEventListener('input', () => {
            headerAlpha = parseInt(headerOpacitySlider.value) / 100;
            headerOpacityVal.textContent = headerOpacitySlider.value + '%';
            updateHeaderBg();
        });

        // Native presets preserve LiteGraph's exact `groupcolor`, which gives
        // rgthree colour filters and WK → native conversion the same identity.
        const applyColorPreset = hex => {
            const nativeHex = normalizeHexColor(hex);
            if (!nativeHex) return;
            headerColorPicker.value = nativeHex;
            // T-044: a preset may pin its own font colour and header opacity.
            // Only `black` does — it stays dark instead of being brightened, so
            // the readable-font rule would pick white on near-black and lose the
            // muted look the dark swatch exists for; and at the default 25% a
            // near-black bar is barely distinguishable from the canvas.
            const pinnedFont = titleColorForNativeHex(nativeHex);
            const pinnedAlpha = headerOpacityForNativeHex(nativeHex, MAX_HEADER_OPACITY);
            if (pinnedAlpha !== null) {
                headerAlpha = pinnedAlpha;
                headerOpacitySlider.value = String(Math.round(pinnedAlpha * 100));
                headerOpacityVal.textContent = headerOpacitySlider.value + '%';
            }
            const fontHex = pinnedFont || groupTitleColorForBackground(displayColorForNativeHex(nativeHex) || nativeHex);
            titleColorPicker.value = fontHex;
            if (titleColorSwatch) titleColorSwatch.style.background = fontHex;
            group.titleColor = fontHex;
            const span = self.groupEls[group.id]?.querySelector('.xzg-group-title-text');
            if (span) span.style.color = fontHex;
            unifiedToggle.checked = true;
            group.useUnifiedColor = true;
            setUnifiedUiState(true);
            // T-045: a preset is a COMPLETE look, and that includes the border
            // width. Leaving the old width behind meant applying a preset to a
            // group configured at 4px gave a result that matched no preset.
            group.borderWidth = PRESET_BORDER_WIDTH;
            if (bwR) bwR.value = String(PRESET_BORDER_WIDTH);
            if (bwV) bwV.textContent = `${PRESET_BORDER_WIDTH}px`;
            const hsl = self.hexToHsl(fontHex);
            syncColorFromHSL(hsl.h, hsl.s, hsl.l);
            updateHeaderBg();
        };
        /*
         * T-044: double-click copies the value rgthree's `matchColors` accepts.
         *
         * Native swatches copy their colour NAME (`red`, `pale_blue`) — the word
         * a user would type, and one that survives a palette retune. WK's own
         * tenth swatch has no native name, so it copies its hex; rgthree accepts
         * that too, whereas an invented word like "other" would be read as the
         * colour `#other`, match nothing, and fail silently.
         *
         * The single click still applies the colour, so a double-click both
         * applies and copies. That is deliberate: a user who double-clicks a
         * swatch almost certainly wants that colour as well as its name.
         */
        const copyPresetValue = async (value, btn = null) => {
            if (!value) return;
            try {
                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
                else throw new Error('clipboard unavailable');
            } catch {
                // Non-secure contexts and older frontends have no async
                // clipboard. Fall back to the selection-based copy rather than
                // failing silently.
                const scratch = document.createElement('textarea');
                scratch.value = value;
                scratch.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
                document.body.appendChild(scratch);
                scratch.select();
                try { document.execCommand('copy'); } catch {}
                scratch.remove();
            }
            /*
             * Confirmation is a brief flash on the swatch itself, not a notice
             * dialog: the user is copying a colour name mid-configuration, and a
             * modal would interrupt that for something they can see happened.
             * The transient aria-label carries the same message for screen
             * readers, which a purely visual cue would not.
             */
            if (!btn) return;
            const previousLabel = btn.getAttribute('aria-label');
            btn.setAttribute('aria-label', t('groups.colorPresetCopied', { value }));
            btn.style.transition = 'box-shadow 120ms ease-out';
            btn.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.9)';
            clearTimeout(btn._xzgCopyFlash);
            btn._xzgCopyFlash = setTimeout(() => {
                btn.style.boxShadow = '';
                if (previousLabel === null) btn.removeAttribute('aria-label');
                else btn.setAttribute('aria-label', previousLabel);
            }, 450);
        };
        for (const btn of bgSwatchButtons) {
            btn.addEventListener('click', () => {
                applyColorPreset(btn.dataset.color);
            });
            btn.addEventListener('dblclick', (e) => {
                e.preventDefault();
                copyPresetValue(btn.dataset.copy, btn);
            });
        }

        // 背景填充开关：启用/关闭内容区填充（颜色与透明度均从标题栏派生）
        backgroundFillToggle.addEventListener('change', () => {
            group.backgroundFillEnabled = backgroundFillToggle.checked;
            refreshBodyFillPreview();
        });

        const rgbaFromHeaderControls = () => {
            const hex = headerColorPicker.value;
            const r = parseInt(hex.slice(1,3),16);
            const g = parseInt(hex.slice(3,5),16);
            const b = parseInt(hex.slice(5,7),16);
            return `rgba(${r},${g},${b},${headerAlpha})`;
        };

        const readControlsStyle = () => ({
            fontSize: parseInt(fsR.value) || 14,
            colorHue: sel.h,
            colorSat: sel.s,
            colorLit: sel.l,
            useUnifiedColor: Boolean(unifiedToggle.checked),
            effect: effectSel.value,
            effectSpeed: parseInt(spdR.value) || 3,
            borderWidth: finiteNumber(bwR.value, 2),
            borderOpacity: (parseInt(boR.value) || 65) / 100,
            cornerRadius: Math.min(20, Math.max(0, finiteNumber(crR.value, 8))),
            shadowSize: Math.max(0, finiteNumber(shadowR.value, 0)),
            shadowColor: shadowColorPicker.value || DEFAULT_SHADOW_COLOR,
            contentPadding: Math.max(0, parseInt(cpR.value) || 0),
            headerBgColor: rgbaFromHeaderControls(),
            backgroundFillEnabled: Boolean(backgroundFillToggle.checked),
            // T-210b: compat field only. New rendering derives body alpha from the
            // header alpha; we still write headerAlpha*0.5 so older readers stay close.
            backgroundOpacity: clamp01(headerAlpha * BODY_TO_HEADER_OPACITY_RATIO),
            titleColor: titleColorPicker.value || '#FFD700',
            nativeGroupColor: normalizeHexColor(headerColorPicker.value),
        });

        const applyStyleToGroupPreview = (style) => {
            Object.assign(group, style);
            self.previewGroupLayout(group.id, {
                fontSize: group.fontSize,
                contentPadding: group.contentPadding,
            });
            const span = self.groupEls[group.id]?.querySelector('.xzg-group-title-text');
            if (span) {
                span.style.fontSize = group.fontSize + 'px';
                span.style.color = group.titleColor || '#FFD700';
            }
            const header = self.groupEls[group.id]?.querySelector('.xzg-group-header');
            if (header) {
                header.style.height = Math.max(21, Math.round((group.fontSize || 14) * 1.8)) + 'px';
                header.style.background = groupHeaderBackground(group);
            }
            self.updatePositions();
            self.updateGroupStyle(group.id);
        };

        const parseRgbaColor = (rgba, fallbackHex = '#000000', fallbackAlpha = DEFAULT_HEADER_OPACITY) => {
            const m = String(rgba || '').match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
            if (!m) return { hex: fallbackHex, alpha: fallbackAlpha };
            const hex = '#' + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            return { hex, alpha: m[4] !== undefined ? parseFloat(m[4]) : 1 };
        };

        const applyStyleToControls = (style) => {
            const merged = { ...self.getBuiltInStyle(), ...style };
            fsR.value = merged.fontSize;
            fsV.textContent = String(merged.fontSize);
            titleColorPicker.value = merged.titleColor || '#FFD700';
            if (titleColorSwatch) titleColorSwatch.style.background = titleColorPicker.value;
            syncColorFromHSL(merged.colorHue, merged.colorSat, merged.colorLit);
            unifiedToggle.checked = Boolean(merged.useUnifiedColor);
            setUnifiedUiState(unifiedToggle.checked);
            // T-210c: when a preset/default has unified on, re-derive border from
            // the loaded font color (borderOpacity is applied separately below).
            if (unifiedToggle.checked) syncBorderColorFromTitle();
            effectSel.value = merged.effect || 'none';
            spdR.value = merged.effectSpeed || 3;
            spdV.textContent = `${spdR.value}X`;
            bwR.value = finiteNumber(merged.borderWidth, 2);
            bwV.textContent = `${bwR.value}px`;
            crR.value = Math.min(20, Math.max(0, finiteNumber(merged.cornerRadius, 8)));
            crV.textContent = `${crR.value}px`;
            boR.value = Math.round((merged.borderOpacity ?? 0.65) * 100);
            boV.textContent = `${boR.value}%`;
            shadowR.value = Math.max(0, finiteNumber(merged.shadowSize, 0));
            shadowV.textContent = `${shadowR.value}px`;
            shadowColorPicker.value = merged.shadowColor || DEFAULT_SHADOW_COLOR;
            if (shadowColorSwatch) shadowColorSwatch.style.background = shadowColorPicker.value;
            cpR.value = merged.contentPadding ?? DEFAULT_CONTENT_PADDING;
            cpV.textContent = `${cpR.value}px`;
            const header = parseRgbaColor(merged.headerBgColor, '#000000', DEFAULT_HEADER_OPACITY);
            headerColorPicker.value = header.hex;
            headerAlpha = Math.max(MIN_HEADER_OPACITY, Math.min(MAX_HEADER_OPACITY, header.alpha));
            headerOpacitySlider.value = Math.round(headerAlpha * 100);
            headerOpacityVal.textContent = `${headerOpacitySlider.value}%`;
            backgroundFillToggle.checked = Boolean(merged.backgroundFillEnabled);
            updateHeaderBg();
            applyStyleToGroupPreview(readControlsStyle());
        };

        const refreshPresetButtons = () => {
            modal.querySelectorAll('.xzg-preset-btn').forEach(btn => {
                const isActive = parseInt(btn.dataset.preset) === activePresetIndex;
                btn.style.background = isActive ? '#0a84ff' : '#333';
                btn.style.borderColor = isActive ? 'rgba(90,200,250,0.95)' : 'rgba(255,255,255,0.15)';
                btn.style.color = isActive ? '#fff' : '#ddd';
                btn.style.boxShadow = isActive ? '0 0 0 1px rgba(10,132,255,0.35)' : 'none';
            });
        };
        refreshPresetButtons();

        const applySettings = (targetGroup) => {
            const newTitle = modal.querySelector('.xzg-set-title').value.trim();
            targetGroup.title = newTitle;
            Object.assign(targetGroup, readControlsStyle());

            // 快捷键自定义
            const sk = modal.querySelector('.xzg-set-shortcut').value.trim().toLowerCase();
            if (sk && sk.length === 1 && /[a-z]/.test(sk)) {
                this.shortcutKey = sk;
                localStorage.setItem('xzg_shortcut', sk);
            }

            // 标题为空时：重建 header 以隐藏文字；否则只更新文本
            const el = this.groupEls[targetGroup.id];
            if (el) {
                if (!newTitle) {
                    this.rebuildGroupEl(targetGroup);
                } else {
                    delete el._xzgRefs;
                    const span = el.querySelector('.xzg-group-title-text');
                    if (span) {
                        span.textContent = targetGroup.title;
                        span.style.fontSize = targetGroup.fontSize + 'px';
                        span.style.color = targetGroup.titleColor;
                        span.style.display = '';
                    }
                    const header = el.querySelector('.xzg-group-header');
                    if (header) {
                        header.style.height = Math.max(21, Math.round((targetGroup.fontSize || 14) * 1.8)) + 'px';
                        header.style.background = groupHeaderBackground(targetGroup);
                    }
                    this.updateGroupStyle(targetGroup.id);
                }
            }

            const currentGroup = this.groups[targetGroup.id] || targetGroup;
            Object.assign(currentGroup, targetGroup);
            this.groups[targetGroup.id] = currentGroup;
            if (currentGroup._previewBounds) {
                currentGroup.bounds = { ...currentGroup._previewBounds };
                delete currentGroup._previewBounds;
                delete currentGroup._previewContentPadding;
            } else {
                this.updateGroupBoundsFromMembers(currentGroup);
            }
            this.rebuildGroupEl(currentGroup);

            this.syncGroupsToExtra();
            this.writeGroupDataToNodes();

            // 先同步新数据，再触发 graph.change，避免恢复链路读到旧编组数据。
            app.graph?.setDirtyCanvas?.(true, true);
            app.graph?.change?.();
            window.Workspace2CanvasGroupsLastApply = {
                at: Date.now(),
                groupId: currentGroup.id,
                group: this.serializeGroup(currentGroup),
                extra: app.graph?.extra?.xzgGroups?.[currentGroup.id] || null,
                nodeBackups: (app.graph?._nodes || [])
                    .filter(n => currentGroup.nodeIds?.some(id => id == n.id))
                    .slice(0, 5)
                    .map(n => ({
                        id: n.id,
                        groupId: n._xzgGroupId || null,
                        groupTitle: n._xzgGroupData?.title || n.properties?._xzgGroup?.title || null,
                        fontSize: n._xzgGroupData?.fontSize || n.properties?._xzgGroup?.fontSize || null,
                    })),
            };
        };

        // 点击外部关闭（定义在按钮处理之前，确保 cleanupModal 捕获最新版本）
        modal.addEventListener('mousedown', e => e.stopPropagation());
        let closeOutFn = null;
        let modalClosed = false;
        const cleanupModal = () => {
            if (closeOutFn) document.removeEventListener('mousedown', closeOutFn);
            if (hiddenPicker && hiddenPicker.parentNode) hiddenPicker.remove();
            if (titleColorPicker && titleColorPicker.parentNode) titleColorPicker.remove();
            if (shadowColorPicker && shadowColorPicker.parentNode) shadowColorPicker.remove();
            if (modal.parentNode) modal.remove();
        };
        // One cancellation path is shared by the Cancel button, an outside
        // click, and Escape.  Settings controls preview directly on `group`,
        // so merely removing the modal would leave a partial title/style edit.
        const cancelModal = () => {
            if (modalClosed) return;
            modalClosed = true;
            this.setActivePreset(activePresetSnapshot);
            revertSnapshot();
            cleanupModal();
        };
        const flashActionSuccess = (button, text, duration = 850) => new Promise(resolve => {
            const originalText = button.textContent;
            const originalBackground = button.style.background;
            const originalBorderColor = button.style.borderColor;
            const originalTransform = button.style.transform;
            button.disabled = true;
            button.textContent = `✓ ${text}`;
            // Use the active ComfyUI theme color, not an unrelated success
            // green, so light/dark/custom themes remain visually coherent.
            button.style.background = 'var(--p-primary-color, var(--accent-color, #0A84FF))';
            button.style.borderColor = 'color-mix(in srgb, var(--p-primary-color, var(--accent-color, #0A84FF)) 72%, white)';
            button.style.transform = 'scale(1.035)';
            setTimeout(() => {
                button.disabled = false;
                button.textContent = originalText;
                button.style.background = originalBackground;
                button.style.borderColor = originalBorderColor;
                button.style.transform = originalTransform;
                resolve();
            }, duration);
        });
        const applyModal = () => {
            if (modalClosed) return;
            modalClosed = true;
            applySettings(group);
            cleanupModal();
        };
        closeOutFn = e => { if (!modal.contains(e.target)) cancelModal(); };
        setTimeout(() => document.addEventListener('mousedown', closeOutFn), 50);

        modal.querySelector('.xzg-set-cancel').addEventListener('click', () => {
            cancelModal();
        });
        modal.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                cancelModal();
                return;
            }
            // Enter is a submit shortcut for editable settings, but must not
            // steal IME composition, native color-picker use, or a focused
            // button's own activation behavior.
            if (e.key === 'Enter' && !e.isComposing && !e.target?.closest?.('button') && e.target?.type !== 'color') {
                e.preventDefault();
                e.stopPropagation();
                applyModal();
            }
        });
        modal.querySelector('.xzg-set-apply').addEventListener('click', () => {
            applyModal();
        });

        modal.querySelectorAll('.xzg-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activePresetIndex = this.setActivePreset(parseInt(btn.dataset.preset) || 0);
                applyStyleToControls(this.readStylePresets()[activePresetIndex]);
                refreshPresetButtons();
            });
        });

        modal.querySelector('.xzg-save-preset').addEventListener('click', async event => {
            this.saveStylePreset(activePresetIndex, readControlsStyle());
            refreshPresetButtons();
            await flashActionSuccess(event.currentTarget, t('groups.saved'));
        });

        modal.querySelector('.xzg-reset-default').addEventListener('click', () => {
            const reset = this.getBuiltInStyle();
            this.saveStylePreset(activePresetIndex, reset);
            applyStyleToControls(reset);
            refreshPresetButtons();
        });

        // 全局应用
        modal.querySelector('.xzg-set-apply-all').addEventListener('click', async event => {
            if (modalClosed) return;
            const style = readControlsStyle();
            for (const [, g2] of Object.entries(this.groups)) {
                Object.assign(g2, style);
                delete g2._previewBounds;
                delete g2._previewContentPadding;
                this.updateGroupBoundsFromMembers(g2);
            }
            this.rebuildAllEls();

            // 标记工作流已修改
            app.graph?.setDirtyCanvas?.(true, true);
            app.graph?.change?.();
            this.syncGroupsToExtra();
            this.writeGroupDataToNodes();
            // Keep the dialog open for further refinement, but do not let a
            // later Cancel falsely undo only the current group after a global
            // operation has already committed every group.
            rebaseCancelSnapshot();
            await flashActionSuccess(event.currentTarget, t('groups.applied'), 360);
        });

        // （closeOut 监听已在上面 cleanupModal 中统一管理）

        // 聚焦标题输入
        setTimeout(() => modal.querySelector('.xzg-set-title').focus(), 100);
    },

    /* ── 重命名 ── */
    startRename(gid, span) {
        const group = this.groups[gid];
        if (!group) return;
        if (span.dataset.editing === '1') return;
        span.dataset.editing = '1';
        const input = document.createElement('input');
        input.className = 'xzg-group-title-input';
        input.value = group.title;
        // T-036: the input replaces the title span inside the header's flex
        // title wrapper, so `flex:1 1 auto; min-width:0` makes the browser fit
        // it to the space left of the action-icon group at any zoom. The old
        // fixed 120px overflowed when zoomed out and looked tiny when zoomed in.
        // Pixel metrics come from the same canvas scale updatePositions() uses.
        const metrics = resolveRenameInputMetrics({
            scale: app?.canvas?.ds?.scale ?? 1,
            fontSize: group.fontSize,
        });
        input.style.cssText = [
            `color:${group.titleColor || '#FFD700'}`,
            `font-size:${metrics.fontSize}px`,
            'font-weight:400',
            'background:rgba(0,0,0,0.8)',
            `border:${metrics.borderWidth}px solid rgba(255,215,0,0.5)`,
            `border-radius:${metrics.borderRadius}px`,
            `padding:${metrics.paddingV}px ${metrics.paddingH}px`,
            'outline:none',
            'flex:1 1 auto',
            'min-width:0',
            'box-sizing:border-box',
        ].join(';') + ';';
        span.replaceWith(input);
        input.focus(); input.select();
        let finished = false;
        const done = (cancel = false) => {
            if (finished) return;
            finished = true;
            const rawTitle = cancel ? group.title : input.value.trim();
            const newTitle = rawTitle || this.uniqueGroupTitle(undefined, group.id);
            group.title = this.uniqueGroupTitle(newTitle, group.id);
            this.syncGroupsToExtra();
            this.writeGroupDataToNodes();
            app.graph?.setDirtyCanvas?.(true, true);
            app.graph?.change?.();
            const ns = document.createElement('span');
            ns.className = 'xzg-group-title-text';
            // Rebuild the span with the same style contract buildGroupEl uses.
            // updatePositions() re-applies font size, line height and colour
            // every frame, but not the ellipsis rules — omitting them here let a
            // long title escape the header after every rename.
            ns.style.cssText = [
                `color:${group.titleColor || '#FFD700'}`,
                `font-size:${group.fontSize || 14}px`,
                'font-weight:400',
                'white-space:nowrap',
                'line-height:1.4',
                'overflow:hidden',
                'text-overflow:ellipsis',
            ].join(';') + ';';
            ns.textContent = group.title;
            input.replaceWith(ns);
            // The per-frame element cache holds the old span, which is now
            // detached. Drop it so the next frame re-queries the live one.
            const box = this.groupEls[group.id];
            if (box) box._xzgRefs = null;
        };
        input.addEventListener('mousedown', e => e.stopPropagation());
        input.addEventListener('click', e => e.stopPropagation());
        input.addEventListener('dblclick', e => e.stopPropagation());
        input.addEventListener('blur', () => done(false));
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                done(false);
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                done(true);
            }
        });
    },

    /* ── 拖动框体（节点跟随，自动收纳框内节点） ── */
    startDrag(gid, downEv) {
        const selectedGroupIds = [...this.selectedGroupIds].filter(id => this.groups[id]?.bounds);
        const canvas = app?.canvas;
        const graph = app?.graph;
        if (!canvas?.ds || !graph?._nodes) return;
        const selectedNodeIds = Object.values(canvas.selected_nodes || {})
            .filter(Boolean)
            .map((node) => node.id);
        if (selectedGroupIds.includes(gid) && (selectedGroupIds.length > 1 || selectedNodeIds.length)) {
            this.startMultiGroupDrag(selectedGroupIds, downEv, selectedNodeIds);
            return;
        }
        const group = this.groups[gid];
        if (!group?.bounds) return;

        const scale = canvas.ds.scale || 1;
        const nodes2 = isNodes2Enabled(app);
        const startX = downEv.clientX;
        const startY = downEv.clientY;
        const startBX = group.bounds.x;
        const startBY = group.bounds.y;
        const b = group.bounds;

        // 找到完全位于当前框体内部的子编组（仅限面积更小的编组，大控制小）
        const childGroups = [];
        const groupArea = b.w * b.h;
        for (const [otherGid, otherG] of Object.entries(this.groups)) {
            if (otherGid === gid) continue;
            const ob = otherG.bounds;
            if (!ob) continue;
            const otherArea = ob.w * ob.h;
            if (otherArea >= groupArea) continue; // 小不控制大
            if (this._isFullyContained(b, ob)) {
                childGroups.push(otherG);
            }
        }
        const childGroupIds = new Set(childGroups.map(g => g.id));

        // 已保存的 nodeIds 是拖动时的权威成员列表；只有旧数据没有成员列表时，
        // 才回退到几何判断。这样节点边缘少量越界也不会在拖动时脱离编组。
        const nodeStarts = [];
        const self = this;
        const persistedIds = Array.isArray(group.nodeIds) ? group.nodeIds : [];
        const persistedSet = new Set(persistedIds.map(id => String(id)));
        const childMemberIds = new Set(
            childGroups.flatMap(child => Array.isArray(child.nodeIds) ? child.nodeIds : [])
                .map(id => String(id))
        );
        const addNodeStart = n => {
            if (!n?.pos) return;
            nodeStarts.push({ node: n, x: n.pos[0], y: n.pos[1] });
        };
        if (persistedSet.size > 0) {
            graph._nodes.forEach(n => {
                if (persistedSet.has(String(n?.id)) && !childMemberIds.has(String(n.id))) {
                    addNodeStart(n);
                }
            });
        } else {
            graph._nodes.forEach(n => {
                if (!n?.pos || childMemberIds.has(String(n.id))) return;
                const nw = n.size?.[0] || 200, nh = n.size?.[1] || 100;
                // T-037: 与 syncNodeMembership 用同一条中心点规则，否则旧数据
                // 回退路径会把刚刚判为成员的节点漏掉。
                if (isNodeInsideGroup(b, { x: n.pos[0], y: n.pos[1], w: nw, h: nh })) {
                    addNodeStart(n);
                }
            });
        }

        // 子编组：收集完全落在当前框体内的节点（大框体外部的节点不受大框体控制）
        const childGroupData = childGroups.map(cg => ({
            group: cg,
            startX: cg.bounds.x,
            startY: cg.bounds.y,
            nodeStarts: cg.nodeIds.map(nid => {
                const n = graph._nodes.find(x => x.id === nid || x.id == nid);
                if (!n?.pos) return null;
                const nw = n.size?.[0] || 200, nh = n.size?.[1] || 100;
                // T-037: 只移动中心点落在大框体内的节点，与成员判定同规则。
                if (isNodeInsideGroup(b, { x: n.pos[0], y: n.pos[1], w: nw, h: nh })) {
                    return { node: n, x: n.pos[0], y: n.pos[1] };
                }
                return null;
            }).filter(Boolean)
        }));

        // 部分重叠编组（有重叠但未完全位于内部）：不移动编组框，只移动完全落在当前编组内的节点
        // 只对面积比当前编组小的编组生效（大控制小，小不控制大）
        const partialOverlapNodes = [];
        const childSet = new Set(childGroupIds);
        for (const [otherGid, otherG] of Object.entries(this.groups)) {
            if (childSet.has(otherGid)) continue;
            const ob = otherG.bounds;
            if (!ob) continue;
            const otherArea = ob.w * ob.h;
            if (otherArea >= groupArea) continue;
            if (this._getOverlapRatio(b, ob) > 0 && !this._isFullyContained(b, ob)) {
                otherG.nodeIds.forEach(nid => {
                    const n = graph._nodes.find(x => x.id === nid || x.id == nid);
                    if (!n?.pos) return;
                    const nw = n.size?.[0] || 200, nh = n.size?.[1] || 100;
                    // T-037: 中心点落在当前编组内即受其控制，与成员判定同规则。
                    if (isNodeInsideGroup(b, { x: n.pos[0], y: n.pos[1], w: nw, h: nh })) {
                        partialOverlapNodes.push({ node: n, x: n.pos[0], y: n.pos[1] });
                    }
                });
            }
        }

        const onMove = e => {
            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;
            group.bounds.x = startBX + dx;
            group.bounds.y = startBY + dy;
            nodeStarts.forEach(s => setNodeGraphPositionFromStart(s, dx, dy, { nodes2 }));
            // 子编组 bounds 及其所有节点一起跟随移动
            childGroupData.forEach(cg => {
                cg.group.bounds.x = cg.startX + dx;
                cg.group.bounds.y = cg.startY + dy;
                cg.nodeStarts.forEach(s => setNodeGraphPositionFromStart(s, dx, dy, { nodes2 }));
            });
            // 部分重叠编组中完全落在大边框内的节点也跟随移动
            partialOverlapNodes.forEach(s => setNodeGraphPositionFromStart(s, dx, dy, { nodes2 }));
            graph.setDirtyCanvas?.(true, true);
        };
        const onUp = createOnceGuard(() => {
            DRAG_MOVE_EVENT_NAMES.forEach((name) => document.removeEventListener(name, onMove, true));
            DRAG_TEARDOWN_EVENT_NAMES.forEach((name) => document.removeEventListener(name, onUp, true));
            self._suspendMembershipSync = false;
            const el = self.groupEls[group.id];
            if (el) el._xzgSyncFrame = 10;
            self.syncGroupsToExtra();
            graph.change?.();
        });
        this._suspendMembershipSync = true;
        // Nodes 2.0 owns pointer-captured gestures.  In that renderer a
        // compatibility mousemove is not guaranteed, so ordinary group drag
        // must listen to the pointer family just like native-node joint drag.
        DRAG_MOVE_EVENT_NAMES.forEach((name) => document.addEventListener(name, onMove, true));
        DRAG_TEARDOWN_EVENT_NAMES.forEach((name) => document.addEventListener(name, onUp, true));
    },

    /* ── 多选拖动：选中编组和节点均按唯一 ID 仅移动一次 ── */
    startMultiGroupDrag(selectedGroupIds, downEv, selectedNodeIds = []) {
        const canvas = app?.canvas;
        const graph = app?.graph;
        if (!canvas?.ds || !graph?._nodes) return;

        const plan = buildMultiGroupDragPlan({
            groups: this.groups,
            nodes: graph._nodes,
            selectedGroupIds,
            selectedNodeIds,
        });
        if (!plan.groupIds.length) return;

        const groupStarts = plan.groupIds
            .map(id => {
                const group = this.groups[id];
                return group?.bounds ? { group, x: group.bounds.x, y: group.bounds.y } : null;
            })
            .filter(Boolean);
        const nodeIds = new Set(plan.nodeIds);
        const nodeStarts = graph._nodes
            .filter(node => nodeIds.has(String(node.id)) && hasNodePosition(node))
            .map(node => ({ node, x: node.pos[0], y: node.pos[1] }));
        const scale = canvas.ds.scale || 1;
        const nodes2 = isNodes2Enabled(app);
        const startX = downEv.clientX;
        const startY = downEv.clientY;
        const self = this;
        this._suspendMembershipSync = true;
        // Non-serialized acceptance evidence.  It lets real-page tests prove
        // whether a drag plan reached graph nodes without changing workflow data.
        window.Workspace2CanvasGroupsLastMultiDrag = {
            at: Date.now(),
            plan: { groupIds: [...plan.groupIds], nodeIds: [...plan.nodeIds] },
            groupStartIds: groupStarts.map(({ group }) => group.id),
            nodeStartIds: nodeStarts.map(({ node }) => String(node.id)),
            lastDelta: { x: 0, y: 0 },
        };

        const onMove = e => {
            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;
            groupStarts.forEach(({ group, x, y }) => {
                group.bounds.x = x + dx;
                group.bounds.y = y + dy;
            });
            nodeStarts.forEach((start) => setNodeGraphPositionFromStart(start, dx, dy, { nodes2 }));
            window.Workspace2CanvasGroupsLastMultiDrag.lastDelta = { x: dx, y: dy };
            graph.setDirtyCanvas?.(true, true);
        };
        const onUp = createOnceGuard(() => {
            DRAG_MOVE_EVENT_NAMES.forEach((name) => document.removeEventListener(name, onMove, true));
            DRAG_TEARDOWN_EVENT_NAMES.forEach((name) => document.removeEventListener(name, onUp, true));
            self._suspendMembershipSync = false;
            // Resume periodic membership checks on a later frame, after the
            // final node and border positions are visible to the overlay.
            groupStarts.forEach(({ group }) => {
                const el = self.groupEls[group.id];
                if (el) el._xzgSyncFrame = 10;
            });
            self.syncGroupsToExtra();
            graph.change?.();
        });
        DRAG_MOVE_EVENT_NAMES.forEach((name) => document.addEventListener(name, onMove, true));
        DRAG_TEARDOWN_EVENT_NAMES.forEach((name) => document.addEventListener(name, onUp, true));
    },

    // Native node drag companion: LiteGraph owns selected node positions.  WK
    // only translates the already selected group borders from the same pointer
    // delta, so a shared member cannot receive the delta twice.
    startNativeNodeJointGroupDrag(plan, downEv) {
        const canvas = app?.canvas;
        const graph = app?.graph;
        if (!canvas?.ds || !graph?._nodes || !plan?.groupIds?.length) return false;
        const groupStarts = plan.groupIds
            .map((id) => {
                const group = this.groups[id];
                return group?.bounds ? { group, x: group.bounds.x, y: group.bounds.y } : null;
            })
            .filter(Boolean);
        if (!groupStarts.length) return false;

        const scale = canvas.ds.scale || 1;
        const startX = downEv.clientX;
        const startY = downEv.clientY;
        const self = this;
        this._suspendMembershipSync = true;
        window.Workspace2CanvasGroupsLastNativeJointDrag = {
            at: Date.now(),
            plan: { groupIds: [...plan.groupIds], nodeIds: [...plan.nodeIds] },
            groupStartIds: groupStarts.map(({ group }) => group.id),
            lastDelta: { x: 0, y: 0 },
        };

        // LiteGraph holds pointer capture for this gesture and calls
        // preventDefault, which suppresses `mousemove` for its whole duration
        // and makes the release arrive as `pointerup` only.  Both the move and
        // the teardown must therefore be listened for on the pointer family.
        // See canvas-groups/drag-teardown.js.
        const onMove = (e) => {
            // Safety net: if every teardown signal was missed, the next
            // buttonless motion ends the drag instead of moving the frame with
            // a bare cursor.
            if (shouldAbortDragFromMove(e)) {
                finish();
                return;
            }
            // Absolute delta from the gesture start, never accumulated, so a
            // pointermove and its compatibility mousemove cannot double the
            // motion.
            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;
            groupStarts.forEach(({ group, x, y }) => {
                group.bounds.x = x + dx;
                group.bounds.y = y + dy;
            });
            window.Workspace2CanvasGroupsLastNativeJointDrag.lastDelta = { x: dx, y: dy };
            graph.setDirtyCanvas?.(true, true);
        };
        const finish = createOnceGuard(() => {
            DRAG_MOVE_EVENT_NAMES.forEach((name) => {
                document.removeEventListener(name, onMove, true);
            });
            DRAG_TEARDOWN_EVENT_NAMES.forEach((name) => {
                document.removeEventListener(name, finish, true);
            });
            // LiteGraph applies its final native node position in the same
            // release turn.  Delay membership reconciliation one frame so it
            // observes that final state rather than a stale intermediate one.
            requestAnimationFrame(() => {
                self._suspendMembershipSync = false;
                groupStarts.forEach(({ group }) => {
                    const el = self.groupEls[group.id];
                    if (el) el._xzgSyncFrame = 10;
                });
                self.syncGroupsToExtra();
                graph.change?.();
            });
        });
        DRAG_MOVE_EVENT_NAMES.forEach((name) => {
            document.addEventListener(name, onMove, true);
        });
        DRAG_TEARDOWN_EVENT_NAMES.forEach((name) => {
            document.addEventListener(name, finish, true);
        });
        return true;
    },

    /* ── 调整大小 ── */
    startResize(gid, downEv, corner = 'se') {
        const group = this.groups[gid];
        if (!group?.bounds) return;

        const canvas = app?.canvas;
        if (!canvas?.ds) return;

        const scale = canvas.ds.scale || 1;
        const startX = downEv.clientX;
        const startY = downEv.clientY;
        const startW = group.bounds.w;
        const startH = group.bounds.h;
        const startBX = group.bounds.x;
        const startBY = group.bounds.y;
        const resizeWest = corner.includes('w');
        const resizeNorth = corner.includes('n');

        const self = this;
        const onMove = e => {
            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;
            const nextW = Math.max(120, startW + (resizeWest ? -dx : dx));
            const nextH = Math.max(44, startH + (resizeNorth ? -dy : dy));
            group.bounds.w = nextW;
            group.bounds.h = nextH;
            group.bounds.x = resizeWest ? startBX + (startW - nextW) : startBX;
            group.bounds.y = resizeNorth ? startBY + (startH - nextH) : startBY;
            app.graph?.setDirtyCanvas?.(true, true);
        };
        const onUp = createOnceGuard(() => {
            DRAG_MOVE_EVENT_NAMES.forEach((name) => document.removeEventListener(name, onMove, true));
            DRAG_TEARDOWN_EVENT_NAMES.forEach((name) => document.removeEventListener(name, onUp, true));
            self.syncGroupsToExtra();
            app.graph?.change?.();
        });
        DRAG_MOVE_EVENT_NAMES.forEach((name) => document.addEventListener(name, onMove, true));
        DRAG_TEARDOWN_EVENT_NAMES.forEach((name) => document.addEventListener(name, onUp, true));
    },

    /* ── 样式更新 ── */
    updateGroupStyle(gid) {
        const el = this.groupEls[gid];
        const g = this.groups[gid];
        if (!el || !g) return;
        const scale = app?.canvas?.ds?.scale || 1;
        const hasEffect = g.effect && g.effect !== 'none';
        const refs = this._ensureRefs(el);
        const bw = finiteNumber(g.borderWidth, 2) * scale;
        const bo = g.borderOpacity ?? 0.65;
        const cr = Math.max(0, finiteNumber(g.cornerRadius, 8)) * scale;
        // T-207 (2026-07-29): keep the selection outline identical to
        // refreshGroupSelection(). This path runs on drag/zoom/sync and used to
        // overwrite it with the old "multi-only 2px dashed" rule, which hid the
        // single-selection outline and reverted multi-selection to dashed.
        const showSelection = this.selectedGroupIds.has(gid);
        el.classList.toggle('is-xzg-group-selected', showSelection);
        el.style.outline = showSelection ? '1px solid rgba(180, 180, 180, 0.5)' : 'none';
        el.style.outlineOffset = showSelection ? '4px' : '0';
        el.style.borderRadius = `${cr}px`;
        el.style.overflow = 'hidden';

        // T-038: ignore/disable now speak ComfyUI's own node language instead of
        // an invented purple — magenta means ignored, faded means deactivated,
        // and ignored is fainter than disabled (see canvas-groups/group-mode-visuals.js).
        // Dimming the whole box in one place is what keeps the border, title bar
        // and icons from drifting apart the way the old per-part colouring did.
        const modeVisuals = groupModeVisuals(g);
        el.style.opacity = modeVisuals.alpha === 1 ? '' : String(modeVisuals.alpha);

        if (modeVisuals.state !== GROUP_MODE_STATE.NORMAL) {
            const tint = modeVisuals.tintColor;
            // Nodes have no border, so native says nothing about one. Tinting it
            // with the same magenta keeps the frame internally consistent;
            // disable leaves the user's own border colour and only fades.
            const h = g.colorHue ?? 48;
            const s = g.colorSat ?? 100;
            const l = g.colorLit ?? 55;
            const borderColor = tint || `hsla(${h},${s}%,${l}%,${bo})`;
            if (!hasEffect) el.style.border = `${bw}px solid ${borderColor}`;
            if (!hasEffect) this.applyUserShadow(el, g, scale);
            if (!hasEffect) el.style.borderImage = 'none';
            el.style.background = 'transparent';
            if (refs.title && !hasEffect) refs.title.style.color = g.titleColor || '#FFD700';
            if (refs.delBtn) refs.delBtn.style.color = borderColor;
            if (refs.rpath) refs.rpath.setAttribute('stroke', borderColor);
        } else {
            const h = g.colorHue ?? 48;
            const s = g.colorSat ?? 100;
            const l = g.colorLit ?? 55;
            if (!hasEffect) el.style.border = `${bw}px solid hsla(${h},${s}%,${l}%,${bo})`;
            if (!hasEffect) this.applyUserShadow(el, g, scale);
            el.style.background = 'transparent';
            if (refs.title) {
                if (!hasEffect) {
                    refs.title.style.color = g.titleColor || '#FFD700';
                }
            }
            if (refs.delBtn) refs.delBtn.style.color = `hsla(${h},${s}%,${l}%,${Math.min(bo + 0.1, 1)})`;
            if (refs.rpath) refs.rpath.setAttribute('stroke', `hsla(${h},${s}%,${l}%,${bo})`);
        }
    },

    rebuildAllEls() {
        // Remove every known and unknown WorkspaceKit element.  This is
        // important after representation changes: an older module instance or
        // a stale group map may have rendered an element that is no longer in
        // `groupEls`, which otherwise survives conversion and does not follow
        // LiteGraph zoom/pan.
        this.overlay?.querySelectorAll?.('.xzg-group-box')?.forEach(el => {
            el._xzgRefs = null;
            el.parentElement?.removeChild(el);
        });
        for (const el of Object.values(this.groupEls)) {
            delete el._xzgRefs;
            el?.parentElement?.removeChild(el);
        }
        this.groupEls = {};
        this.selectedGroupIds = new Set([...this.selectedGroupIds].filter(gid => this.groups[gid]));
        for (const id of Object.keys(this.groups)) this.renderGroup(id);
    },

    rebuildGroupEl(group) {
        const el = this.groupEls[group.id];
        if (el) {
            delete el._xzgRefs;
            el?.parentElement?.removeChild(el);
            delete this.groupEls[group.id];
        }
        this.renderGroup(group.id);
    },

    /* ── 编组执行模式：保存并恢复每个节点原模式 ──
     * 不依赖 rgthree，也不改写 LGraphCanvas 原型。WorkspaceKit 的编组是 DOM 覆盖层，
     * 因此直接按 group.nodeIds 操作即可。快照需要随工作流序列化，避免重开后无法恢复。
     */
    _getGroupNodes(group, graph = app?.graph) {
        if (!graph?._nodes || !group?.nodeIds?.length) return [];
        const seen = new Set();
        return graph._nodes.filter(node => {
            if (!node || seen.has(String(node.id))) return false;
            if (!this._idInArray(group.nodeIds, node.id)) return false;
            seen.add(String(node.id));
            return true;
        });
    },

    _getGroupModeValue(modeName) {
        if (modeName === 'bypass') return MODE_BYPASS;
        if (modeName === 'mute') return globalThis.LiteGraph?.NEVER ?? 2;
        return null;
    },

    updateGroupModeButtons(gid) {
        const group = this.groups[gid];
        const el = this.groupEls[gid];
        if (!group || !el) return;
        el.querySelectorAll('.xzg-group-mode-btn[data-group-mode]').forEach(btn => {
            const active = group.executionMode === btn.dataset.groupMode;
            // T-038: the activation background and border are gone. The whole
            // frame now carries the state (magenta for ignore, faded for
            // disable), so a coloured tile behind the icon is duplicate
            // information — and the icons are hidden most of the time now, so it
            // was the less visible of the two signals anyway. The tooltip and
            // aria-pressed remain the state's accessible form.
            btn.style.background = 'transparent';
            btn.style.borderColor = 'transparent';
            btn.style.color = group.titleColor || '#FFD700';
            btn.title = active ? t('groups.actionRestore') : t(btn.dataset.groupMode === 'mute' ? 'groups.actionMute' : 'groups.actionBypass');
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    },

    _restoreGroupExecutionMode(group, graph = app?.graph) {
        const snapshot = group?.executionModeSnapshot;
        if (!snapshot || typeof snapshot !== 'object') return false;
        for (const node of this._getGroupNodes(group, graph)) {
            const key = Object.keys(snapshot).find(id => this._idEq(id, node.id));
            if (key !== undefined) node.mode = snapshot[key];
        }
        delete group.executionMode;
        delete group.executionModeSnapshot;
        this.updateGroupModeButtons(group.id);
        return true;
    },

    toggleGroupExecutionMode(gid, modeName) {
        const group = this.groups[gid];
        const graph = app?.graph;
        const mode = this._getGroupModeValue(modeName);
        if (!group || !graph || mode === null) return;
        const nodes = this._getGroupNodes(group, graph);
        if (!nodes.length) return;

        if (group.executionMode === modeName && group.executionModeSnapshot) {
            this._restoreGroupExecutionMode(group, graph);
        } else {
            // 仅在第一次进入“旁路/禁用”时保存原模式；从旁路切到禁用时继续使用同一份原始快照。
            if (!group.executionModeSnapshot || typeof group.executionModeSnapshot !== 'object') {
                group.executionModeSnapshot = Object.fromEntries(nodes.map(node => [String(node.id), node.mode ?? MODE_ALWAYS]));
            }
            group.executionMode = modeName;
            nodes.forEach(node => { node.mode = mode; });
            this.updateGroupModeButtons(gid);
        }

        this.syncGroupsToExtra();
        this.writeGroupDataToNodes();
        graph.setDirtyCanvas?.(true, true);
        graph.change?.();
    },

    _getGroupOutputNodes(group, graph = app?.graph) {
        const never = globalThis.LiteGraph?.NEVER ?? 2;
        return this._getGroupNodes(group, graph).filter(node => (
            node.mode !== never && Boolean(node.constructor?.nodeData?.output_node)
        ));
    },

    async queueGroupOutputNodes(gid) {
        const group = this.groups[gid];
        const outputNodes = this._getGroupOutputNodes(group);
        if (!outputNodes.length) {
            await this.showNotice(t('groups.noOutputNodes'));
            return;
        }

        try {
            // rgthree exposes this public queue helper on window. It performs
            // the complete app.queuePrompt() lifecycle (including randomized
            // seed controls), then limits prompt.output to the selected output
            // nodes and their dependencies. Reusing it keeps the WorkspaceKit
            // button behaviour identical to rgthree's proven context-menu item.
            const rgthreeQueue = window.rgthree?.queueOutputNodes;
            if (typeof rgthreeQueue === 'function') {
                await rgthreeQueue.call(window.rgthree, outputNodes);
                return;
            }

            // rgthree is optional. Without it, use ComfyUI's own command
            // rather than submitting a hand-built API request. The command
            // preserves the native queue lifecycle and sends only selected
            // output nodes. Restore selection immediately after queueing so
            // the group button does not disturb the user's canvas state.
            const canvas = app?.canvas;
            const command = app?.extensionManager?.command;
            if (!canvas?.selectItems || typeof command?.execute !== 'function') {
                await this.showNotice(t('groups.queueUnavailable'));
                return;
            }
            const previousNodes = Object.values(canvas.selected_nodes || {}).filter(Boolean);
            const previousGroup = canvas.selected_group;
            try {
                canvas.deselectAllNodes?.();
                canvas.selectItems(outputNodes);
                await command.execute('Comfy.QueueSelectedOutputNodes');
            } finally {
                canvas.deselectAllNodes?.();
                if (previousNodes.length) canvas.selectItems(previousNodes);
                canvas.selected_group = previousGroup;
                canvas.setDirty?.(true, true);
            }
        } catch (error) {
            console.error('[WorkspaceKit Canvas Groups] Queue group output nodes failed:', error);
            await this.showNotice(t('groups.queueFailed'));
        }
    },

    /* ── 旁路 ── */
    toggleBypass(gid) {
        const g = this.groups[gid];
        if (!g) return;
        const graph = app?.graph;
        if (!graph) return;

        const willBypass = !g.bypassed;
        const mode = willBypass ? MODE_BYPASS : MODE_ALWAYS;
        const b = g.bounds;

        // 1. 完全子编组（完全位于内部）：切换编组状态，只切换完全落在当前框体内的节点
        const fullChildGroupIds = this._collectChildGroups(gid);
        fullChildGroupIds.forEach(id => {
            const grp = this.groups[id];
            if (!grp) return;
            grp.bypassed = willBypass;
            grp.nodeIds.forEach(nid => {
                const n = graph._nodes.find(x => x.id === nid || x.id == nid);
                if (!n?.pos) return;
                const nw = n.size?.[0] || 200, nh = n.size?.[1] || 100;
                // T-037: 只切换中心点落在大框体内的节点，与成员判定同规则。
                if (isNodeInsideGroup(b, { x: n.pos[0], y: n.pos[1], w: nw, h: nh })) {
                    n.mode = mode;
                }
            });
            this.updateGroupStyle(id);
        });

        // 2. 部分重叠编组（有重叠但未完全位于内部）：不切换编组状态，只切换完全落在当前编组内的节点
        // 只对面积比当前编组小的编组生效（大控制小，小不控制大）
        const fullSet = new Set(fullChildGroupIds);
        const groupArea = b.w * b.h;
        for (const [otherGid, otherG] of Object.entries(this.groups)) {
            if (fullSet.has(otherGid)) continue;
            const ob = otherG.bounds;
            if (!ob) continue;
            const otherArea = ob.w * ob.h;
            if (otherArea >= groupArea) continue;
            // 有重叠但未完全位于内部
            if (this._getOverlapRatio(b, ob) > 0 && !this._isFullyContained(b, ob)) {
                otherG.nodeIds.forEach(nid => {
                    const n = graph._nodes.find(x => x.id === nid || x.id == nid);
                    if (!n?.pos) return;
                    const nw = n.size?.[0] || 200, nh = n.size?.[1] || 100;
                    // T-037: 中心点落在当前编组内即受其控制，与成员判定同规则。
                    if (isNodeInsideGroup(b, { x: n.pos[0], y: n.pos[1], w: nw, h: nh })) {
                        n.mode = mode;
                    }
                });
            }
        }

        // 先保存当前状态到 extra，再触发 graph.change（防止 configure 钩子读取旧数据）
        this.syncGroupsToExtra();
        graph.setDirtyCanvas?.(true, true); graph.change?.();
    },

    /* 计算子编组被父编组覆盖的面积比例 (0~1) */
    _getOverlapRatio(parentBounds, childBounds) {
        const x1 = Math.max(parentBounds.x, childBounds.x);
        const y1 = Math.max(parentBounds.y, childBounds.y);
        const x2 = Math.min(parentBounds.x + parentBounds.w, childBounds.x + childBounds.w);
        const y2 = Math.min(parentBounds.y + parentBounds.h, childBounds.y + childBounds.h);
        if (x2 <= x1 || y2 <= y1) return 0;
        const overlap = (x2 - x1) * (y2 - y1);
        const childArea = childBounds.w * childBounds.h;
        return childArea > 0 ? overlap / childArea : 0;
    },

    /* 判断 childBounds 是否完全位于 parentBounds 内部 */
    _isFullyContained(parentBounds, childBounds) {
        return childBounds.x >= parentBounds.x &&
               childBounds.y >= parentBounds.y &&
               childBounds.x + childBounds.w <= parentBounds.x + parentBounds.w &&
               childBounds.y + childBounds.h <= parentBounds.y + parentBounds.h;
    },

    /* 计算两个编组框的 IoU（交并比） */
    _getIoU(a, b) {
        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.w, b.x + b.w);
        const y2 = Math.min(a.y + a.h, b.y + b.h);
        if (x2 <= x1 || y2 <= y1) return 0;
        const inter = (x2 - x1) * (y2 - y1);
        const areaA = a.w * a.h;
        const areaB = b.w * b.h;
        const union = areaA + areaB - inter;
        return union > 0 ? inter / union : 0;
    },

    /* 收集指定编组及其所有完全位于内部的子编组（仅限面积更小的编组，大控制小） */
    _collectChildGroups(gid, visited = new Set()) {
        if (visited.has(gid)) return [];
        visited.add(gid);
        const result = [gid];
        const group = this.groups[gid];
        if (!group?.bounds) return result;
        const groupArea = group.bounds.w * group.bounds.h;

        for (const [otherGid, otherG] of Object.entries(this.groups)) {
            if (otherGid === gid) continue;
            const ob = otherG.bounds;
            if (!ob) continue;
            const otherArea = ob.w * ob.h;
            if (otherArea >= groupArea) continue; // 小不控制大
            if (this._isFullyContained(group.bounds, ob)) {
                result.push(...this._collectChildGroups(otherGid, visited));
            }
        }
        return result;
    },

    /* 收集所有被当前编组包含或有重叠且面积更小的编组（递归传递）
     * 用于绕过/开启的联动控制：大编组切换绕过时，所有有重叠的小编组都跟着切换
     * 注意：小编组切换绕过时不影响大编组（单向控制）
     * 注意：移动编组时仍使用 _collectChildGroups（>50% 覆盖才一起移动）
     */
    _collectLinkedGroups(gid, visited = new Set()) {
        if (visited.has(gid)) return [];
        visited.add(gid);
        const result = [gid];
        const group = this.groups[gid];
        if (!group?.bounds) return result;
        const groupArea = group.bounds.w * group.bounds.h;

        for (const [otherGid, otherG] of Object.entries(this.groups)) {
            if (otherGid === gid) continue;
            const ob = otherG.bounds;
            if (!ob) continue;
            const otherArea = ob.w * ob.h;
            // 只收集面积比当前编组小且有重叠的编组（大控制小，小不控制大）
            if (otherArea < groupArea && this._getOverlapRatio(group.bounds, ob) > 0) {
                result.push(...this._collectLinkedGroups(otherGid, visited));
            }
        }
        return result;
    },

    /* ── 删除 ── */
    removeGroups(groupIds) {
        const ids = [...new Set(groupIds || [])].filter(gid => this.groups[gid]);
        if (!ids.length) return false;
        const graph = app?.graph;
        for (const gid of ids) {
            const group = this.groups[gid];
            if (graph && !this._restoreGroupExecutionMode(group, graph) && group.bypassed) {
                group.nodeIds.forEach(nid => { const n = graph._nodes.find(x => x.id === nid || x.id == nid); if (n) n.mode = MODE_ALWAYS; });
            }
            this.killGroup(gid);
        }
        this.activeGroupId = this.groups[this.activeGroupId] ? this.activeGroupId : null;
        this.refreshGroupSelection();
        graph?.setDirtyCanvas?.(true, true); graph?.change?.();
        this.syncGroupsToExtra();
        return true;
    },

    removeGroup(gid) {
        return this.removeGroups([gid]);
    },

    removeSelectedGroups() {
        return this.removeGroups([...this.selectedGroupIds]);
    },

    ungroupSelection() {
        const graph = app?.graph;
        if (!graph?._nodes) return false;

        const selected = Object.values(app?.canvas?.selected_nodes || {}).filter(Boolean);
        const selectedIds = new Set(selected.map(n => n.id));
        const groupIds = new Set();

        // Shift-click multi-selection is independent from LiteGraph's native
        // node selection. Include it first so Shift+G dissolves every selected
        // WorkspaceKit group, not only the most recently active one.
        for (const gid of this.selectedGroupIds) {
            if (this.groups[gid]) groupIds.add(gid);
        }

        for (const node of selected) {
            if (node?._xzgGroupId && this.groups[node._xzgGroupId]) {
                groupIds.add(node._xzgGroupId);
            }
        }

        if (selectedIds.size) {
            for (const [gid, group] of Object.entries(this.groups)) {
                if ((group.nodeIds || []).some(nid => selectedIds.has(nid) || [...selectedIds].some(id => this._idEq(id, nid)))) {
                    groupIds.add(gid);
                }
            }
        }

        if (!groupIds.size && this.activeGroupId && this.groups[this.activeGroupId]) {
            groupIds.add(this.activeGroupId);
        }

        if (!groupIds.size) {
            console.debug('[Workspace2 Canvas Groups] No selected or active group to ungroup.');
            return false;
        }

        for (const gid of groupIds) {
            const group = this.groups[gid];
            if (!group) continue;
            for (const node of graph._nodes) {
                const inGroup = this._idInArray(group.nodeIds || [], node.id) || this._idEq(node._xzgGroupId, gid);
                if (!inGroup) continue;
                if (group.executionModeSnapshot && typeof group.executionModeSnapshot === 'object') {
                    const key = Object.keys(group.executionModeSnapshot).find(id => this._idEq(id, node.id));
                    if (key !== undefined) node.mode = group.executionModeSnapshot[key];
                } else if (group.bypassed) {
                    node.mode = MODE_ALWAYS;
                }
                if (this._idEq(node._xzgGroupId, gid)) {
                    this._clearNodeGroupData(node);
                }
            }
            this.killGroup(gid);
        }

        this.activeGroupId = null;
        graph.setDirtyCanvas?.(true, true);
        graph.change?.();
        this.syncGroupsToExtra();
        console.log('[Workspace2 Canvas Groups] 取消编组:', [...groupIds]);
        return true;
    },

    serializeGroup(g) {
        return {
            id: g.id,
            title: g.title,
            nodeIds: [...(g.nodeIds || [])],
            allowEmpty: Boolean(g.allowEmpty),
            bypassed: Boolean(g.bypassed),
            // 记录逐节点原模式，保证“旁路/禁用 → 恢复”不把用户的手动模式改成执行。
            executionMode: g.executionMode || null,
            executionModeSnapshot: g.executionModeSnapshot ? { ...g.executionModeSnapshot } : null,
            bounds: { ...(g.bounds || {}) },
            fontSize: g.fontSize,
            colorHue: g.colorHue,
            colorSat: g.colorSat,
            colorLit: g.colorLit,
            useUnifiedColor: Boolean(g.useUnifiedColor),
            effect: g.effect,
            effectSpeed: g.effectSpeed,
            borderWidth: g.borderWidth,
            borderOpacity: g.borderOpacity,
            cornerRadius: g.cornerRadius,
            shadowSize: Math.max(0, finiteNumber(g.shadowSize, 0)),
            shadowColor: g.shadowColor || DEFAULT_SHADOW_COLOR,
            contentPadding: g.contentPadding ?? DEFAULT_CONTENT_PADDING,
            headerBgColor: g.headerBgColor,
            backgroundFillEnabled: Boolean(g.backgroundFillEnabled),
            backgroundOpacity: Math.max(0.05, Math.min(0.95, finiteNumber(g.backgroundOpacity, DEFAULT_BACKGROUND_OPACITY))),
            titleColor: g.titleColor,
            // Keep the stable LiteGraph / rgthree colour identity in every
            // workflow-level and node-level backup.  Without this field a
            // harmless workflow save downgraded the group to its rendered
            // rgba colour and broke native-name colour matching after reload.
            nativeGroupColor: resolveWorkspaceKitGroupNativeColor(g),
        };
    },

    // Stage 3: prepare a reversible archive without switching the active
    // representation. The later conversion command will persist this record
    // transactionally before creating native LiteGraph groups.
    createConversionArchive(timestamp = new Date().toISOString()) {
        return createWorkspaceKitGroupConversionArchive(
            this.groups,
            group => this.serializeGroup(group),
            timestamp
        );
    },

    getGroupRepresentation(graph = app?.graph) {
        return this._nativeRepresentation || graph?.extra?.workspacekit?.groupRepresentation === 'native'
            ? 'native'
            : 'workspacekit';
    },

    getConversionInfo() {
        const graph = app?.graph;
        const workspaceKitGroups = Object.values(this.groups || {}).filter(Boolean);
        // This is an in-memory concurrency token, not persisted workflow data.
        // It lets Settings prove that the confirmed action still targets the
        // same graph and the same WorkspaceKit group payload.
        const conversionSignature = workspaceKitGroups
            .map(group => JSON.stringify(this.serializeGroup(group)))
            .sort()
            .join('|');
        const nativeGroupCount = Array.isArray(graph?._groups) ? graph._groups.length : 0;
        const representation = this.getGroupRepresentation(graph);
        const restoring = Boolean(this._needRestore && this._pendingGroups);
        return {
            graph,
            conversionSignature,
            representation,
            workspaceKitGroupCount: workspaceKitGroups.length,
            nativeGroupCount,
            isReady: Boolean(graph) && !restoring && !this._conversionInProgress,
            isConverting: Boolean(this._conversionInProgress),
            isMixed: representation !== 'native' && workspaceKitGroups.length > 0 && nativeGroupCount > 0,
            hasConversionArchive: Boolean(graph?.extra?.workspacekit?.groupConversion),
        };
    },

    isConversionSnapshotCurrent(snapshot) {
        if (!snapshot || snapshot.graph !== app?.graph) return false;
        const current = this.getConversionInfo();
        return current.isReady
            && current.representation === 'workspacekit'
            && current.workspaceKitGroupCount > 0
            && current.workspaceKitGroupCount === Number(snapshot.workspaceKitGroupCount || 0)
            && current.nativeGroupCount === Number(snapshot.nativeGroupCount || 0)
            && current.conversionSignature === snapshot.conversionSignature;
    },

    verifyNativeConversionResult({ graph, originalNativeGroups, sourceGroups, nativeGroupIds, archive }) {
        const sourceNodeIds = new Set(sourceGroups.flatMap(group => group.nodeIds || []).map(String));
        // Stale-marker judgement lives in the pure conversion-result module so
        // the T-003 shared-member fixture and its static contract stay aligned.
        const staleNodeMarkerCount = countStaleWorkspaceKitNodeMarkers({
            nodes: graph._nodes || [],
            sourceNodeIds,
        });
        const result = validateNativeGroupConversionResult({
            nativeGroups: graph._groups || [],
            originalNativeGroups,
            sourceGroupIds: sourceGroups.map(group => group.id),
            nativeGroupIds,
            representation: graph.extra?.workspacekit?.groupRepresentation,
            archive: graph.extra?.workspacekit?.groupConversion || archive,
            workspaceKitGroupCount: Object.values(this.groups || {}).filter(Boolean).length,
            persistedWorkspaceKitGroupCount: Object.keys(graph.extra?.xzgGroups || {}).length,
            staleNodeMarkerCount,
        });
        if (!result.valid) throw new Error(`Native group conversion validation failed: ${result.reason}`);
        if (Object.keys(this.groupEls || {}).length) {
            throw new Error("Native group conversion validation failed: WorkspaceKit overlay elements remain");
        }
        return result;
    },

    getNativeGroupConversionSnapshot(graph = app?.graph) {
        // LiteGraph's Vector4 is array-like/iterable in current ComfyUI builds,
        // but is not guaranteed to satisfy Array.isArray().  Normalize it here
        // before handing the data to the portable reverse-conversion planner.
        const copyVector = value => {
            if (!value || typeof value[Symbol.iterator] !== "function") return null;
            const copied = [...value];
            return copied.length >= 4 ? copied : null;
        };
        return (graph?._groups || []).map(group => ({
            id: group.id,
            title: group.title,
            pos: Array.isArray(group.pos) ? [...group.pos] : null,
            size: Array.isArray(group.size) ? [...group.size] : null,
            bounding: copyVector(group._bounding) || copyVector(group.bounding),
            color: group.color,
            nodeIds: Array.isArray(group._nodes) ? group._nodes.map(node => String(node.id)) : [],
        }));
    },

    verifyWorkspaceKitConversionResult({ graph, plan, existingIds = [], removedNativeGroups }) {
        const persistedGroups = graph.extra?.xzgGroups || {};
        // T-206: after a mixed-state reverse conversion the result is the union
        // of the pre-existing WorkspaceKit groups and the freshly converted ones.
        const expectedIds = [...new Set([...existingIds, ...Object.keys(plan.groups || {})])].map(String).sort();
        const activeIds = Object.keys(this.groups || {}).sort();
        const persistedIds = Object.keys(persistedGroups).sort();
        if (graph.extra?.workspacekit?.groupRepresentation !== 'workspacekit') {
            throw new Error('WorkspaceKit conversion validation failed: representation was not set to WorkspaceKit');
        }
        if ((graph._groups || []).some(group => removedNativeGroups.includes(group))) {
            throw new Error('WorkspaceKit conversion validation failed: native groups remain');
        }
        if (JSON.stringify(activeIds) !== JSON.stringify(expectedIds) || JSON.stringify(persistedIds) !== JSON.stringify(expectedIds)) {
            throw new Error('WorkspaceKit conversion validation failed: restored group data does not match the plan');
        }
        if (Object.keys(this.groupEls || {}).length !== expectedIds.length) {
            throw new Error('WorkspaceKit conversion validation failed: overlay elements do not match restored groups');
        }
        return true;
    },

    /**
     * Convert the current workflow's active WorkspaceKit overlays to native
     * LiteGraph groups. Existing native groups are preserved. The archive is
     * written only after every source group and native constructor capability
     * has been validated; any mutation failure removes all newly added groups
     * and restores the graph metadata and node snapshots.
     */
    convertCurrentWorkflowToNative(expectedSnapshot = null) {
        const graph = app?.graph;
        const GroupCtor = globalThis.LiteGraph?.LGraphGroup || globalThis.LGraphGroup;
        if (!graph || typeof graph.add !== 'function' || typeof graph.remove !== 'function' || typeof GroupCtor !== 'function') {
            throw new Error('This ComfyUI frontend does not expose native canvas-group support.');
        }
        if (this._conversionInProgress) {
            return { converted: 0, representation: this.getGroupRepresentation(graph), inProgress: true };
        }
        if (expectedSnapshot && !this.isConversionSnapshotCurrent(expectedSnapshot)) {
            return { converted: 0, representation: this.getGroupRepresentation(graph), stale: true };
        }
        if (this._nativeRepresentation || graph.extra?.workspacekit?.groupRepresentation === 'native') {
            return { converted: 0, representation: 'native', alreadyNative: true };
        }

        const sourceGroups = Object.values(this.groups || {}).filter(Boolean);
        if (!sourceGroups.length) {
            return { converted: 0, representation: 'workspacekit', empty: true };
        }
        const archive = this.createConversionArchive();
        const archiveCheck = validateWorkspaceKitGroupConversionArchive(archive);
        if (!archiveCheck.valid) throw new Error(`Cannot archive WorkspaceKit groups: ${archiveCheck.reason}`);
        const nodeIds = new Set((graph._nodes || []).map(node => String(node.id)));
        for (const group of sourceGroups) {
            const b = group.bounds;
            if (!b || ![b.x, b.y, b.w, b.h].every(value => Number.isFinite(Number(value))) || Number(b.w) <= 0 || Number(b.h) <= 0) {
                throw new Error(`Group "${group.title || group.id}" has invalid bounds.`);
            }
            for (const nodeId of group.nodeIds || []) {
                if (!nodeIds.has(String(nodeId))) {
                    throw new Error(`Group "${group.title || group.id}" references a missing node.`);
                }
            }
        }

        const originalExtra = graph.extra ? JSON.parse(JSON.stringify(graph.extra)) : undefined;
        const originalNativeGroups = [...(graph._groups || [])];
        const originalNativeRepresentation = this._nativeRepresentation;
        const originalGroups = this.groups;
        const originalNodeData = new Map();
        const sourceNodeIds = new Set(sourceGroups.flatMap(group => group.nodeIds || []).map(id => String(id)));
        for (const node of graph._nodes || []) {
            if (!sourceNodeIds.has(String(node.id))) continue;
            originalNodeData.set(node, {
                groupId: node._xzgGroupId,
                groupData: node._xzgGroupData,
                propertyGroup: node.properties?._xzgGroup,
            });
        }

        const addedGroups = [];
        this._conversionInProgress = true;
        try {
            const nativeGroupIds = {};
            for (const source of sourceGroups) {
                const bounds = source.bounds;
                const native = new GroupCtor(source.title || 'Group');
                native.pos = [Number(bounds.x), Number(bounds.y)];
                native.size = [Math.max(140, Number(bounds.w)), Math.max(80, Number(bounds.h))];
                const nativeColor = nativeColorFromWorkspaceKitGroup(source);
                if (nativeColor) native.color = nativeColor;
                graph.add(native);
                addedGroups.push(native);
                nativeGroupIds[source.id] = native.id;
            }
            for (const native of addedGroups) {
                native.recomputeInsideNodes?.();
            }

            const workspacekit = graph.extra?.workspacekit && typeof graph.extra.workspacekit === 'object'
                ? JSON.parse(JSON.stringify(graph.extra.workspacekit))
                : {};
            workspacekit.groupRepresentation = 'native';
            workspacekit.groupConversion = {
                ...archive,
                nativeGroupIds,
            };
            graph.extra = graph.extra || {};
            graph.extra.workspacekit = workspacekit;
            graph.extra.xzgGroups = {};

            for (const node of graph._nodes || []) {
                if (sourceNodeIds.has(String(node.id))) this._clearNodeGroupData(node);
            }
            this.groups = {};
            this.groupEls = {};
            this.selectedGroupIds = new Set();
            this._pendingGroups = null;
            this._needRestore = false;
            this._nativeRepresentation = true;
            this.rebuildAllEls();
            graph.setDirtyCanvas?.(true, true);
            graph.change?.();
            this.syncGroupsToExtra();
            this.verifyNativeConversionResult({
                graph,
                originalNativeGroups,
                sourceGroups,
                nativeGroupIds,
                archive,
            });
            console.log('[Workspace2 Canvas Groups] 已转换为 ComfyUI 原生编组:', addedGroups.length);
            return {
                converted: addedGroups.length,
                representation: 'native',
                archive,
                nativeGroupIds,
            };
        } catch (error) {
            for (const native of addedGroups.reverse()) {
                try { graph.remove(native); } catch {}
            }
            if (originalExtra === undefined) delete graph.extra;
            else graph.extra = originalExtra;
            for (const [node, state] of originalNodeData) {
                node._xzgGroupId = state.groupId;
                node._xzgGroupData = state.groupData;
                node.properties = node.properties || {};
                if (state.propertyGroup === undefined) delete node.properties._xzgGroup;
                else node.properties._xzgGroup = state.propertyGroup;
            }
            this.groups = originalGroups;
            this._nativeRepresentation = originalNativeRepresentation;
            this.rebuildAllEls();
            graph.setDirtyCanvas?.(true, true);
            throw error;
        } finally {
            this._conversionInProgress = false;
        }
    },

    /**
     * Convert all current native LiteGraph groups back to active WorkspaceKit
     * groups. Current native geometry/title/member IDs are authoritative;
     * forward-conversion archives contribute the original visual/execution
     * style only. This method is intentionally not exposed in Settings until
     * the transaction and real-page acceptance batches are complete.
     */
    convertCurrentWorkflowToWorkspaceKit() {
        const graph = app?.graph;
        if (!graph || typeof graph.add !== 'function' || typeof graph.remove !== 'function') {
            throw new Error('This ComfyUI frontend does not expose native canvas-group support.');
        }
        if (this._conversionInProgress) {
            return { converted: 0, representation: this.getGroupRepresentation(graph), inProgress: true };
        }
        // T-206 (2026-07-28): the reverse conversion now works from a mixed
        // canvas too. Existing WorkspaceKit overlay groups are preserved and the
        // current native groups are converted and merged into them, instead of
        // the old "pure native only" guard that returned a no-op. A pure
        // WorkspaceKit canvas with no native groups is still a no-op.
        const existingGroups = this.groups && typeof this.groups === 'object' ? this.groups : {};
        const existingIds = Object.keys(existingGroups);
        const hasNativeGroups = Array.isArray(graph._groups) && graph._groups.length > 0;
        if (!hasNativeGroups) {
            return { converted: 0, representation: this.getGroupRepresentation(graph), alreadyWorkspaceKit: true };
        }
        const archive = graph.extra?.workspacekit?.groupConversion;
        const nativeGroupIds = archive?.nativeGroupIds;
        const nativeGroups = this.getNativeGroupConversionSnapshot(graph);
        const plan = createNativeToWorkspaceKitConversionPlan({ archive, nativeGroupIds, nativeGroups, reservedIds: existingIds });
        // Merge: keep the live WorkspaceKit groups, add the newly converted ones.
        // The planner reserved existingIds so plan.groups cannot collide.
        const mergedGroups = { ...JSON.parse(JSON.stringify(existingGroups)), ...JSON.parse(JSON.stringify(plan.groups)) };
        const originalExtra = graph.extra ? JSON.parse(JSON.stringify(graph.extra)) : undefined;
        const originalNativeGroups = [...(graph._groups || [])];
        const originalNativeRepresentation = this._nativeRepresentation;
        const originalGroups = this.groups;
        const originalNodeData = new Map((graph._nodes || []).map(node => [node, {
            groupId: node._xzgGroupId,
            groupData: node._xzgGroupData,
            propertyGroup: node.properties?._xzgGroup,
        }]));

        this._conversionInProgress = true;
        try {
            for (const native of originalNativeGroups) graph.remove(native);
            const workspacekit = graph.extra?.workspacekit && typeof graph.extra.workspacekit === 'object'
                ? JSON.parse(JSON.stringify(graph.extra.workspacekit))
                : {};
            workspacekit.groupRepresentation = 'workspacekit';
            workspacekit.nativeGroupConversion = {
                schemaVersion: 1,
                source: 'native',
                convertedAt: new Date().toISOString(),
                groups: nativeGroups,
            };
            graph.extra = graph.extra || {};
            graph.extra.workspacekit = workspacekit;
            graph.extra.xzgGroups = JSON.parse(JSON.stringify(mergedGroups));

            this._nativeRepresentation = false;
            this._pendingGroups = null;
            this._needRestore = false;
            this.groups = JSON.parse(JSON.stringify(mergedGroups));
            this.groupEls = {};
            this.selectedGroupIds = new Set();
            this.rebuildAllEls();
            this.writeGroupDataToNodes(mergedGroups);
            this.syncGroupsToExtra();
            graph.setDirtyCanvas?.(true, true);
            graph.change?.();
            this.verifyWorkspaceKitConversionResult({ graph, plan, existingIds, removedNativeGroups: originalNativeGroups });
            console.log('[Workspace2 Canvas Groups] 已转换回 WorkspaceKit 编组:', Object.keys(plan.groups).length, '合并后共', Object.keys(mergedGroups).length);
            return {
                converted: Object.keys(plan.groups).length,
                representation: 'workspacekit',
                plan,
                mergedGroupCount: Object.keys(mergedGroups).length,
            };
        } catch (error) {
            this.groups = {};
            this.groupEls = {};
            this.rebuildAllEls();
            if (originalExtra === undefined) delete graph.extra;
            else graph.extra = originalExtra;
            for (const native of originalNativeGroups) {
                if (!(graph._groups || []).includes(native)) graph.add(native);
            }
            for (const [node, state] of originalNodeData) {
                node._xzgGroupId = state.groupId;
                node._xzgGroupData = state.groupData;
                node.properties = node.properties || {};
                if (state.propertyGroup === undefined) delete node.properties._xzgGroup;
                else node.properties._xzgGroup = state.propertyGroup;
            }
            this.groups = originalGroups;
            this._nativeRepresentation = originalNativeRepresentation;
            this.rebuildAllEls();
            graph.setDirtyCanvas?.(true, true);
            throw error;
        } finally {
            this._conversionInProgress = false;
        }
    },

    writeGroupDataToNodes(groupData = null) {
        const graph = app?.graph;
        if (!graph?._nodes) return;
        const data = groupData || Object.fromEntries(Object.entries(this.groups).map(([id, group]) => [id, this.serializeGroup(group)]));
        const nodeGroupMap = {};
        for (const [gid, group] of Object.entries(data)) {
            for (const nid of group.nodeIds || []) {
                nodeGroupMap[nid] = { groupId: gid, groupData: group };
            }
        }
        for (const node of graph._nodes) {
            const match = nodeGroupMap[node.id] || Object.entries(nodeGroupMap).find(([key]) => key == node.id)?.[1];
            if (match) {
                node._xzgGroupId = match.groupId;
                node._xzgGroupData = JSON.parse(JSON.stringify(match.groupData));
                node.properties = node.properties || {};
                node.properties._xzgGroup = JSON.parse(JSON.stringify(match.groupData));
            } else if (node._xzgGroupId && !data[node._xzgGroupId]) {
                this._clearNodeGroupData(node);
            }
        }
    },
    /* ── 持久化：同步到 app.graph.extra + localStorage ── */
    syncGroupsToExtra() {
        if (!app?.graph) return;
        const gd = {};
        for (const [id, g] of Object.entries(this.groups)) {
            gd[id] = this.serializeGroup(g);
        }
        app.graph.extra = app.graph.extra || {};
        app.graph.extra.xzgGroups = gd;
        this.writeGroupDataToNodes(gd);
        // 立即写入 localStorage 兜底
        try {
            if (Object.keys(gd).length) {
                localStorage.setItem('xzg_groups_backup', JSON.stringify(gd));
            } else {
                localStorage.removeItem('xzg_groups_backup');
            }
        } catch(e) {}
    },

    setupSerializationHooks(retryCount = 0) {
        if (window._workspace2_canvas_group_srl) return;
        
        const self = this;
        const LG = window.LiteGraph;
        if (!LG) {
            if (retryCount < 60) {
                setTimeout(() => self.setupSerializationHooks(retryCount + 1), 100);
                return;
            }
            console.warn('[Workspace2 Canvas Groups] 序列化 Hook 安装失败：LiteGraph 超时未就绪，将使用 extra 备份');
            // 即使 LiteGraph 不可用，也尝试用 extra 做持久化
            window._workspace2_canvas_group_srl = true;
            this._setupExtraBasedPersistence();
            return;
        }
        window._workspace2_canvas_group_srl = true;

        // 尝试通过 LiteGraph 钩子持久化（兼容旧版）
        if (LG.LGraphNode) {
            try {
                const s = LG.LGraphNode.prototype.serialize;
                if (s) {
                    LG.LGraphNode.prototype.serialize = function() {
                        const d = s.apply(this, arguments);
                        if (this._xzgGroupId) {
                            d._xzgGroupId = this._xzgGroupId;
                            if (this._xzgGroupData) d._xzgGroup = JSON.parse(JSON.stringify(this._xzgGroupData));
                        }
                        return d;
                    };
                }
            } catch(e) {}
            try {
                const c = LG.LGraphNode.prototype.configure;
                if (c) {
                    LG.LGraphNode.prototype.configure = function(d) {
                        c.apply(this, arguments);
                        if (d?._xzgGroupId !== undefined) {
                            if (d._xzgGroupId) {
                                this._xzgGroupId = d._xzgGroupId;
                                this._xzgGroupData = d._xzgGroup || null;
                            } else {
                                this._xzgGroupId = null;
                                this._xzgGroupData = null;
                            }
                            self._needRestore = true;
                        }
                    };
                }
            } catch(e) {}
        }
        if (LG.LGraph) {
            try {
                const s = LG.LGraph.prototype.serialize;
                if (s) {
                    LG.LGraph.prototype.serialize = function() {
                        const d = s.apply(this, arguments);
                        const gd = {};
                        for (const [id, g] of Object.entries(self.groups)) {
                            gd[id] = self.serializeGroup(g);
                        }
                        if (Object.keys(gd).length) {
                            console.log('[Workspace2 Canvas Groups] LGraph.serialize写入编组数据:', Object.keys(gd).length, '个');
                            d._xzgGroups = gd;
                        }
                        d.extra = d.extra || {};
                        d.extra.xzgGroups = gd;

                        if (d.nodes && d.nodes.length) {
                            const nodeGroupMap = {};
                            for (const [gid, g] of Object.entries(self.groups)) {
                                const groupData = gd[gid];
                                for (const nid of g.nodeIds) {
                                    nodeGroupMap[nid] = { groupId: gid, groupData: groupData };
                                }
                            }
                            for (const nd of d.nodes) {
                                const nid = nd.id;
                                const match = nodeGroupMap[nid] || Object.entries(nodeGroupMap).find(([k]) => k == nid)?.[1];
                                if (match) {
                                    nd._xzgGroupId = match.groupId;
                                    nd._xzgGroup = JSON.parse(JSON.stringify(match.groupData));
                                }
                            }
                        }
                        return d;
                    };
                }
            } catch(e) {}
            try {
                const c = LG.LGraph.prototype.configure;
                if (c) {
                    LG.LGraph.prototype.configure = function(d) {
                        const nativeRepresentation = d?.extra?.workspacekit?.groupRepresentation === 'native';
                        self._nativeRepresentation = nativeRepresentation;
                        const pendingFromTop = nativeRepresentation ? null : (d?._xzgGroups || d?.extra?.xzgGroups || null);
                        if (pendingFromTop) console.log('[Workspace2 Canvas Groups] LGraph.configure检测到编组数据:', Object.keys(pendingFromTop).length, '个');
                        c.apply(this, arguments);
                        if (app?.graph !== this) return;

                        // 保存当前用户自定义属性（颜色、标题、效果等）
                        const savedCustomProps = {};
                        for (const [gid, g] of Object.entries(self.groups)) {
                            savedCustomProps[gid] = {
                                title: g.title,
                                fontSize: g.fontSize,
                                colorHue: g.colorHue,
                                colorSat: g.colorSat,
                                colorLit: g.colorLit,
                                effect: g.effect,
                                effectSpeed: g.effectSpeed,
                                borderWidth: g.borderWidth,
                                borderOpacity: g.borderOpacity,
                                cornerRadius: g.cornerRadius,
                                shadowSize: g.shadowSize,
                                shadowColor: g.shadowColor,
                                contentPadding: g.contentPadding,
                                headerBgColor: g.headerBgColor,
                                backgroundFillEnabled: Boolean(g.backgroundFillEnabled),
                                backgroundOpacity: g.backgroundOpacity,
                                titleColor: g.titleColor,
                            };
                        }

                        // 将自定义属性合并到序列化数据中，确保 restoreGroups 读取正确值
                        if (pendingFromTop) {
                            for (const [gid, props] of Object.entries(savedCustomProps)) {
                                if (pendingFromTop[gid]) {
                                    Object.assign(pendingFromTop[gid], props);
                                }
                            }
                        }

                        for (const gid of Object.keys(self.groups)) self.killGroup(gid);
                        self.groups = {};
                        self._needRestore = true;
                        self._pendingGroups = pendingFromTop;
                        if (app.graph._nodes?.length) {
                            console.log('[Workspace2 Canvas Groups] LGraph.configure立即恢复');
                            self.restoreGroups();
                        }
                    };
                }
            } catch(e) {}
        }

        // 额外保障：基于 extra 的持久化（新版 ComfyUI 前端兼容）
        this._setupExtraBasedPersistence();
    },

    /* ── 基于 extra 的持久化（兼容新版 ComfyUI 前端） ── */
    _setupExtraBasedPersistence() {
        if (this._extraPersistenceReady) return;
        this._extraPersistenceReady = true;
        const self = this;

        // ── 辅助：序列化所有编组数据 ──
        const serializeGroups = () => {
            const gd = {};
            for (const [id, g] of Object.entries(self.groups)) {
                gd[id] = self.serializeGroup(g);
            }
            return gd;
        };

        // ── 方案1：Hook graphToPrompt（保存时注入编组数据） ──
        const tryHookGraphToPrompt = () => {
            if (!app?.graphToPrompt) {
                setTimeout(tryHookGraphToPrompt, 200);
                return;
            }
            const orig = app.graphToPrompt;
            app.graphToPrompt = async function() {
                const result = await orig.apply(this, arguments);
                // 直接修改序列化输出，确保编组数据被写入工作流 JSON
                if (result?.workflow) {
                    const gd = serializeGroups();
                    console.log('[Workspace2 Canvas Groups] graphToPrompt写入编组数据:', Object.keys(gd).length, '个');
                    result.workflow.extra = result.workflow.extra || {};
                    result.workflow.extra.xzgGroups = gd;
                    // 也同步到 app.graph.extra（用于 loadGraphData 钩子恢复）
                    self.syncGroupsToExtra();
                }
                return result;
            };
            console.log('[Workspace2 Canvas Groups] graphToPrompt 钩子已安装');
        };
        tryHookGraphToPrompt();

        // ── 方案2：Hook loadGraphData（加载时恢复编组数据） ──
        const tryHookLoadGraphData = () => {
            if (!app?.loadGraphData) {
                setTimeout(tryHookLoadGraphData, 200);
                return;
            }
            const origLoad = app.loadGraphData;
            app.loadGraphData = async function(data, ...args) {
                // 从加载的数据中提取编组信息
                const nativeRepresentation = data?.extra?.workspacekit?.groupRepresentation === 'native';
                self._nativeRepresentation = nativeRepresentation;
                const groups = nativeRepresentation ? null : (data?.extra?.xzgGroups || data?._xzgGroups || null);
                if (groups && Object.keys(groups).length) {
                    self._pendingGroups = groups;
                    self._needRestore = true;
                    console.log('[Workspace2 Canvas Groups] loadGraphData检测到编组数据:', Object.keys(groups).length, '个');
                }
                const result = await origLoad.apply(this, arguments);
                return result;
            };
            console.log('[Workspace2 Canvas Groups] loadGraphData 钩子已安装');
        };
        tryHookLoadGraphData();

        // ── 方案3：localStorage 兜底（每10秒保存一次） ──
        if (!this._extraSyncInterval) {
            this._extraSyncInterval = setInterval(() => {
                self.syncGroupsToExtra();
                // 同时备份到 localStorage
                try {
                    const gd = self._nativeRepresentation ? {} : serializeGroups();
                    if (Object.keys(gd).length && !self._nativeRepresentation) {
                        localStorage.setItem('xzg_groups_backup', JSON.stringify(gd));
                    } else {
                        localStorage.removeItem('xzg_groups_backup');
                    }
                } catch(e) {}
            }, 5000);
        }

        // ── 方案4：从 localStorage 恢复（兜底） ──
        try {
            const backup = localStorage.getItem('xzg_groups_backup');
            if (backup && !this._nativeRepresentation) {
                const gd = JSON.parse(backup);
                if (gd && Object.keys(gd).length && !this._pendingGroups) {
                    this._pendingGroups = gd;
                    this._needRestore = true;
                }
            }
        } catch(e) {}
    },

    waitForGraph() {
        let n = 0; const self = this;
        const ck = () => {
            n++;
            if (app?.graph?._nodes?.length && self._needRestore && self._pendingGroups) {
                console.log('[Workspace2 Canvas Groups] waitForGraph触发恢复');
                self.restoreGroups();
                return;
            }
            if (n < 60) setTimeout(ck, 250);
        };
        setTimeout(ck, 100);
    },

    restoreGroups() {
        if (!app?.graph) return;
        this._needRestore = false;

        if (this._nativeRepresentation || app.graph.extra?.workspacekit?.groupRepresentation === 'native') {
            this._nativeRepresentation = true;
            this._pendingGroups = null;
            this.groups = {};
            // Native groups are now the only active representation.  Clear
            // stale WorkspaceKit node markers before rebuilding the overlay;
            // otherwise the legacy fallback scan below can resurrect the old
            // DOM group after a reload.
            for (const node of app.graph._nodes || []) this._clearNodeGroupData(node);
            this.rebuildAllEls();
            return;
        }

        console.log('[Workspace2 Canvas Groups] 恢复编组...', this._pendingGroups ? Object.keys(this._pendingGroups).length + '个编组数据待恢复' : '无待恢复数据');

        // 优先从工作流保存的完整编组数据恢复（包含动画、颜色、标题等）
        if (this._pendingGroups) {
            for (const [id, g] of Object.entries(this._pendingGroups)) {
                this.groups[id] = { ...g, title: normalizeGroupTitle(g?.title) };
            }
            this._pendingGroups = null;
        }

        // 额外：从 app.graph.extra 恢复（兼容新版 ComfyUI 前端）。
        // extra 是当前工作流级数据，优先级应高于节点旧备份。
        if (app?.graph?.extra?.xzgGroups && Object.keys(app.graph.extra.xzgGroups).length) {
            for (const [id, g] of Object.entries(app.graph.extra.xzgGroups)) {
                this.groups[id] = { ...(this.groups[id] || {}), ...g };
            }
        }

        if (!app.graph._nodes?.length) {
            this.rebuildAllEls();
            return;
        }

        // 多重冗余恢复：从节点的多个备份位置恢复编组数据
        const groupDataMap = {};
        app.graph._nodes.forEach(n => {
            // 备份位置1：节点实例上的 _xzgGroupData（最新序列化时写入）
            let pg = n._xzgGroupData;
            // 备份位置2：节点序列化数据直接字段 _xzgGroup（configure时恢复到_xzgGroupData，这里再查一次）
            if (!pg && n._xzgGroup) pg = n._xzgGroup;
            // 备份位置3：节点 properties._xzgGroup
            if (!pg) pg = n.properties?._xzgGroup;
            if (pg && pg.id) {
                // 用最新的数据覆盖（同一编组多个节点，取第一个找到的完整数据）
                if (!groupDataMap[pg.id] || (pg.nodeIds && pg.nodeIds.length)) {
                    groupDataMap[pg.id] = pg;
                }
            }
        });

        // 将从节点收集到的编组数据合并到groups
        for (const [gid, gd] of Object.entries(groupDataMap)) {
            if (!this.groups[gid]) {
                this.groups[gid] = { ...gd, title: normalizeGroupTitle(gd?.title) };
            } else {
                // 如果已有顶层数据，保留顶层数据，只补充缺失字段
                for (const key of Object.keys(gd)) {
                    if (this.groups[gid][key] === undefined) {
                        this.groups[gid][key] = gd[key];
                    }
                }
            }
        }

        // 根据节点上的 groupId 校正/补充 nodeIds（兼容旧工作流或节点恢复场景）
        const map = {};
        app.graph._nodes.forEach(n => { if (n._xzgGroupId) (map[n._xzgGroupId] ??= []).push(n.id); });
        for (const [gid, nids] of Object.entries(map)) {
            if (!this.groups[gid]) {
                // 优先从 extra 恢复完整数据（含用户自定义颜色等），仅作兜底才用默认值
                const fromExtra = app?.graph?.extra?.xzgGroups?.[gid];
                const bounds = this.calcBounds(nids) || { x: 0, y: 0, w: 300, h: 200 };
                this.groups[gid] = fromExtra ? { ...fromExtra, title: normalizeGroupTitle(fromExtra.title) } : {
                    ...this.getBuiltInStyle(),
                    id: gid, title: this.uniqueGroupTitle(undefined, gid), nodeIds: nids, bypassed: false, bounds
                };
            } else {
                this.groups[gid].nodeIds = nids;
                if (this.groups[gid].contentPadding === undefined) this.groups[gid].contentPadding = DEFAULT_CONTENT_PADDING;
                if (this.groups[gid].backgroundFillEnabled === undefined) this.groups[gid].backgroundFillEnabled = false;
                if (this.groups[gid].backgroundOpacity === undefined) this.groups[gid].backgroundOpacity = DEFAULT_BACKGROUND_OPACITY;
                if (this.groups[gid].shadowSize === undefined) this.groups[gid].shadowSize = 0;
                if (!this.groups[gid].shadowColor) this.groups[gid].shadowColor = DEFAULT_SHADOW_COLOR;
                // 确保bounds存在
                if (!this.groups[gid].bounds) {
                    this.groups[gid].bounds = this.calcBounds(nids) || { x: 0, y: 0, w: 300, h: 200 };
                }
            }
        }
        for (const group of Object.values(this.groups)) {
            if (group.contentPadding === undefined) group.contentPadding = DEFAULT_CONTENT_PADDING;
            if (group.backgroundFillEnabled === undefined) group.backgroundFillEnabled = false;
            if (group.backgroundOpacity === undefined) group.backgroundOpacity = DEFAULT_BACKGROUND_OPACITY;
            if (group.shadowSize === undefined) group.shadowSize = 0;
            if (!group.shadowColor) group.shadowColor = DEFAULT_SHADOW_COLOR;
        }
        for (const gid of Object.keys(this.groups)) {
            const group = this.groups[gid];
            if ((!group.nodeIds || !group.nodeIds.length) && !group.allowEmpty) delete this.groups[gid];
        }
        this.rebuildAllEls();
        this.applyBypassStates();
        window.Workspace2CanvasGroupsLastRestore = {
            at: Date.now(),
            groupCount: Object.keys(this.groups).length,
            pendingCount: this._pendingGroups ? Object.keys(this._pendingGroups).length : 0,
            extraCount: app?.graph?.extra?.xzgGroups ? Object.keys(app.graph.extra.xzgGroups).length : 0,
            nodeBackupCount: Object.keys(groupDataMap || {}).length,
            groups: Object.fromEntries(Object.entries(this.groups).map(([gid, group]) => [gid, this.serializeGroup(group)])),
        };
        console.log('[Workspace2 Canvas Groups] 恢复完成，编组数量:', Object.keys(this.groups).length);
    },

    applyBypassStates() {
        const g = app?.graph;
        if (!g?._nodes) return;
        for (const grp of Object.values(this.groups)) {
            // 只重放当前由编组控制的模式。普通编组绝不能在工作流恢复时强制写回
            // MODE_ALWAYS，否则会覆盖用户在 ComfyUI 中独立设置的旁路/禁用状态。
            const controlledMode = grp.executionMode ? this._getGroupModeValue(grp.executionMode) : (grp.bypassed ? MODE_BYPASS : null);
            if (controlledMode === null) continue;
            this._getGroupNodes(grp, g).forEach(node => { node.mode = controlledMode; });
            this.updateGroupModeButtons(grp.id);
        }
        g.setDirtyCanvas?.(true, true);
    }
};

window.Workspace2CanvasGroups = Workspace2CanvasGroups;
export { Workspace2CanvasGroups as workspace2CanvasGroups };
