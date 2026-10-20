// ===== Färger för molnbakgrunden: dag och natt =====
const CLOUD_COLORS = {
  light: {
    backgroundColor: 0xffffff,
    skyColor: 0x68b8d7,
    cloudColor: 0xadc1de,
    cloudShadowColor: 0x183550,
    sunColor: 0xff9919,
    sunGlareColor: 0xff6633,
    sunlightColor: 0xff9933
  },
  dark: {
    backgroundColor: 0x0b1d3a,
    skyColor: 0x0b1d3a,
    cloudColor: 0x3a4a6b,
    cloudShadowColor: 0x050b18,
    sunColor: 0x8fa8d8,      // månen
    sunGlareColor: 0x5a73b0,
    sunlightColor: 0x7f95c9
  }
};

const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");

function currentTheme() {
  return root.dataset.theme === "dark" ? "dark" : "light";
}

// ===== Animerad molnbakgrund (Vanta.js Clouds) =====
let vantaEffect = null;

function startBackground() {
  // Hoppa över om biblioteken inte laddats (t.ex. offline) – då syns reservfärgen i CSS
  if (vantaEffect || !window.VANTA || !window.THREE) return;

  try {
    vantaEffect = VANTA.CLOUDS({
      el: "#vanta-bg",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 3.0,
      scaleMobile: 12.0,
      speed: 0.2,
      ...CLOUD_COLORS[currentTheme()]
    });
  } catch (error) {
    // WebGL fungerar inte – reservfärgen används istället
    console.warn("Vanta kunde inte startas:", error);
  }
}

function stopBackground() {
  if (vantaEffect) {
    vantaEffect.destroy(); // frigör minne och tar bort canvasen
    vantaEffect = null;
  }
}

// Respektera användare som valt "minska rörelse" i sitt system
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function syncBackground() {
  if (reducedMotion.matches) {
    stopBackground();
  } else {
    startBackground();
  }
}

// ===== Mörkt läge =====
function setTheme(theme) {
  const isDark = theme === "dark";

  if (isDark) {
    root.dataset.theme = "dark";
  } else {
    delete root.dataset.theme;
  }
  themeToggle.setAttribute("aria-checked", String(isDark));

  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}

  fadeClouds(CLOUD_COLORS[theme]);
}

// Tona molnens färger över tid (Vanta byter annars direkt)
const FADE_MS = 1000;
let shownColors = { ...CLOUD_COLORS[currentTheme()] };
let fadeFrame = null;

function mixColor(from, to, t) {
  let result = 0;
  for (const shift of [16, 8, 0]) {
    const a = (from >> shift) & 255;
    const b = (to >> shift) & 255;
    result |= Math.round(a + (b - a) * t) << shift;
  }
  return result;
}

function fadeClouds(target) {
  cancelAnimationFrame(fadeFrame);
  if (!vantaEffect) {
    shownColors = { ...target };
    return;
  }

  const start = { ...shownColors };
  const duration = reducedMotion.matches ? 0 : FADE_MS;
  const t0 = performance.now();

  function step(now) {
    const raw = duration ? Math.min((now - t0) / duration, 1) : 1;
    const t = raw * raw * (3 - 2 * raw); // mjuk start och slut
    for (const key in target) {
      shownColors[key] = mixColor(start[key], target[key], t);
    }
    vantaEffect.setOptions(shownColors);
    if (raw < 1) fadeFrame = requestAnimationFrame(step);
  }
  fadeFrame = requestAnimationFrame(step);
}

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

themeToggle.setAttribute("aria-checked", String(currentTheme() === "dark"));

// ===== Sidbyte: startsida <-> Projects =====
// Sidorna är olika "lägen" på samma sida, så att menyn kan animeras mjukt mellan dem.
const projectsLink = document.querySelector('.nav a[href="#projects"]');
const homeLink = document.querySelector(".nav__home");

function renderPage() {
  const isProjects = location.hash === "#projects";
  document.body.classList.toggle("is-projects", isProjects);
  if (isProjects) {
    projectsLink.setAttribute("aria-current", "page");
  } else {
    projectsLink.removeAttribute("aria-current");
  }
  homeLink.toggleAttribute("inert", !isProjects); // går inte att tabba till när den är dold
}

// Första renderingen utan animation, annars glider menyn när sidan öppnas på #projects
document.body.classList.add("no-transition");
renderPage();
requestAnimationFrame(() =>
  requestAnimationFrame(() => document.body.classList.remove("no-transition"))
);
window.addEventListener("hashchange", renderPage);

syncBackground();
reducedMotion.addEventListener("change", syncBackground);
window.addEventListener("pagehide", stopBackground);
