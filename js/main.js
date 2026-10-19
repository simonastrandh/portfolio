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
      backgroundColor: 0xffffff,
      skyColor: 0x68b8d7,
      cloudColor: 0xadc1de,
      cloudShadowColor: 0x183550,
      sunColor: 0xff9919,
      sunGlareColor: 0xff6633,
      sunlightColor: 0xff9933
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

syncBackground();
reducedMotion.addEventListener("change", syncBackground);
window.addEventListener("pagehide", stopBackground);
