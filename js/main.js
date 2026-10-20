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
const navLinks = document.querySelectorAll(".nav a.nav__item");
const homeLink = document.querySelector(".nav__home");
const pages = [...document.querySelectorAll(".page")];
const routes = pages.map((page) => page.dataset.route); // ordning = ordningen i menyn

let currentRoute = null;

// Sidan ritas bara medan den rör sig. Bara sidans EGEN transform-transition får avsluta det:
// transitionend bubblar upp från element inuti sidan (t.ex. kort som tonar vid hover),
// och en avbruten transition (transitioncancel) får inte räknas.
pages.forEach((page) => {
  page.addEventListener("transitionend", (event) => {
    if (event.target === page && event.propertyName === "transform") {
      clearTimeout(page.movingTimer);
      page.classList.remove("is-moving");
    }
  });
});

// Var ska en sida stå när man är på "route"?
//  active = synlig, left/right = utanför bild åt sidan, below = utanför bild nedanför (startsidan)
function stateFor(page, route) {
  if (!routes.includes(route)) return "below";
  if (page.dataset.route === route) return "active";
  return routes.indexOf(page.dataset.route) < routes.indexOf(route) ? "left" : "right";
}

function setState(page, state) {
  page.classList.toggle("is-active", state === "active");
  page.classList.toggle("is-left", state === "left");
  page.classList.toggle("is-right", state === "right");
  page.toggleAttribute("inert", state !== "active");
}

function renderPage(isFirst) {
  const next = routes.includes(location.hash) ? location.hash : "#home";
  const prev = currentRoute;
  if (next === prev) return;
  currentRoute = next;

  // Menyn: hem-ikon och markering av aktiv sida
  const onSubpage = next !== "#home";
  document.body.classList.toggle("is-subpage", onSubpage);
  homeLink.toggleAttribute("inert", !onSubpage); // går inte att tabba till när den är dold
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === next) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (isFirst) {
    pages.forEach((page) => setState(page, stateFor(page, next)));
    return;
  }

  // Bara sidan vi lämnar och sidan vi går till animeras. Övriga hoppar direkt
  // till sin plats, så de aldrig syns glida över skärmen.
  const animated = pages.filter((page) => [prev, next].includes(page.dataset.route));
  const instant = pages.filter((page) => !animated.includes(page));

  instant.forEach((page) => {
    page.style.transition = "none";
    setState(page, stateFor(page, next));
  });
  void document.body.offsetWidth; // tvinga webbläsaren att räkna ut läget innan animationen startar
  instant.forEach((page) => (page.style.transition = ""));

  animated.forEach((page) => {
    // Sidan ritas bara medan den rör sig
    page.classList.add("is-moving");
    // Reservtimer om ingen transition startar (t.ex. vid snabba byten fram och tillbaka).
    // En gammal timer från ett tidigare byte får aldrig stänga av ett nytt.
    clearTimeout(page.movingTimer);
    page.movingTimer = setTimeout(() => page.classList.remove("is-moving"), 2500);
    // Tillbaka till startsidan väntar sidan på att ikonen skjutits ihop, precis som menyn
    page.style.setProperty("--page-delay", next === "#home" ? "var(--icon-time)" : "0s");
    setState(page, stateFor(page, next));
  });

  // Börja överst nästa gång en sida öppnas, men först när den är utom synhåll
  pages.forEach((page) => {
    if (stateFor(page, next) !== "active") {
      setTimeout(() => {
        if (!page.classList.contains("is-active")) page.scrollTop = 0;
      }, 2200);
    }
  });
}

// Första renderingen utan animation, annars glider menyn när sidan öppnas på #projects
document.body.classList.add("no-transition");
renderPage(true);
requestAnimationFrame(() =>
  requestAnimationFrame(() => document.body.classList.remove("no-transition"))
);
window.addEventListener("hashchange", () => renderPage(false));

syncBackground();
reducedMotion.addEventListener("change", syncBackground);
window.addEventListener("pagehide", stopBackground);

// ===== Copy-knappar (kopierar t.ex. e-postadressen) =====
document.querySelectorAll("[data-copy]").forEach((button) => {
  const label = button.textContent;
  button.addEventListener("click", async () => {
    const text = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Reserv för webbläsare/lägen där Clipboard API inte är tillgängligt (t.ex. file://)
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    button.textContent = "Copied!";
    clearTimeout(button.resetTimer);
    button.resetTimer = setTimeout(() => (button.textContent = label), 1800);
  });
});

// ===== Projektkorten leder ingenstans än: visa ett meddelande vid klick, tryck eller Enter/mellanslag =====
document.querySelectorAll(".card").forEach((card) => {
  const showNotice = () => {
    card.classList.add("is-notice");
    clearTimeout(card.noticeTimer);
    card.noticeTimer = setTimeout(() => card.classList.remove("is-notice"), 2600);
  };

  card.addEventListener("click", showNotice);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showNotice();
    }
  });
});
