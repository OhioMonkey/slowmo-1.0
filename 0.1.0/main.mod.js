import { PolyMod, MixinType, SettingType } from "https://cdn.polymodloader.com/cb/polytrackmods/PolyModLoader/0.6.0/PolyTypes.js";

// 0.5 = half speed. Try 0.25 for quarter speed. Must be > 0.
const SPEED = 0.5;

// 1) Main page: slow the clock the page sees (animations, camera, UI).
function installTimeWarp(getScale) {
    if (window.__slowmoInstalled) return;
    window.__slowmoInstalled = true;

    const realPerfNow = performance.now.bind(performance);
    const realRAF = window.requestAnimationFrame.bind(window);
    const realDateNow = Date.now.bind(Date);

    const startReal = realPerfNow();
    const startDate = realDateNow();
    let lastReal = startReal;
    let virtual = startReal;

    // Virtual time advances at (real elapsed * scale). Changing the scale
    // mid-session never makes time jump or go backwards.
    const now = () => {
        const r = realPerfNow();
        virtual += (r - lastReal) * getScale();
        lastReal = r;
        return virtual;
    };

    performance.now = now;
    Date.now = () => startDate + (now() - startReal);
    window.requestAnimationFrame = (cb) => realRAF(() => cb(now()));
}

// 2) Simulation worker: the car physics run in a separate worker with its own
// clock (it steps the car by real elapsed time), so it needs the same slowdown.
// This code is injected at the very top of the worker's source.
const workerPrelude = (speed) => `
(function () {
    // The worker is loaded from a blob, so make relative importScripts work.
    const base = self.location.origin + "/";
    const realImport = self.importScripts.bind(self);
    self.importScripts = (...u) => realImport(...u.map(
        (x) => /^(blob:|https?:|data:)/.test(x) ? x : new URL(x, base).href));
    const real = performance.now.bind(performance);
    let last = real(), virt = last;
    performance.now = () => {
        const r = real();
        virt += (r - last) * ${speed};
        last = r;
        return virt;
    };
})();
`;

function isEnabled() {
    try {
        const v = window.polyModLoader.getSetting("SlowMotion");
        return !(v === "false" || v === false);
    } catch (e) { return true; } // setting not registered yet: stay enabled
}

class SlowMotionMod extends PolyMod {
    preInit = (pml) => {
        installTimeWarp(() => (isEnabled() ? SPEED : 1));
    }
    init = (pml) => {
        this.pml = pml;
        pml.registerSettingCategory("Slow Motion");
        pml.registerSetting("SlowMotion", "SlowMotion", SettingType.BOOL, true);
        // Takes effect after the next page reload.
        if (isEnabled()) {
            pml.registerSimWorkerMixin({
                type: MixinType.INSERT,
                token: "(() => {",
                func: workerPrelude(SPEED),
            });
        }
    }
}

export let polyMod = new SlowMotionMod();
