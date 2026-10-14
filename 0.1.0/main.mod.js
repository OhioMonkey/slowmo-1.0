import { PolyMod, SettingType } from "https://cdn.polymodloader.com/cb/polytrackmods/PolyModLoader/0.6.0/PolyTypes.js";

// 0.5 = half speed. Try 0.25 for quarter speed. Must be > 0.
const SPEED = 0.5;

// Slows the clock the page sees. The game loop reads time from
// performance.now / requestAnimationFrame, so scaling those slows everything.
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

class SlowMotionMod extends PolyMod {
    preInit = (pml) => {
        this.enabled = true; // used until the setting is registered
        installTimeWarp(() => {
            try {
                const v = window.polyModLoader.getSetting("Slow motion");
                if (v === "false" || v === false) return 1;
            } catch (e) { /* setting not registered yet: stay enabled */ }
            return SPEED;
        });
    }
    init = (pml) => {
        this.pml = pml;
        pml.registerSettingCategory("Slow Motion");
        pml.registerSetting("Slow motion", "Slow motion", SettingType.BOOL, true);
    }
}

export let polyMod = new SlowMotionMod();
