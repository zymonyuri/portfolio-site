const yearElement = document.getElementById("year");
const body = document.body;
const cursorParticlesCanvas = document.getElementById("cursor-particles");
const cursorParticlesContext = cursorParticlesCanvas.getContext("2d");
const themeToggle = document.getElementById("theme-toggle");
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");
const bootModule = document.getElementById("boot-module");
const bootLeft = document.getElementById("boot-left");
const bootRight = document.getElementById("boot-right");
const skillsPrev = document.getElementById("skills-prev");
const skillsNext = document.getElementById("skills-next");
const dashboardPrev = document.getElementById("dashboard-prev");
const dashboardNext = document.getElementById("dashboard-next");
const dashboardPosition = document.getElementById("dashboard-position");
const softwarePrev = document.getElementById("software-prev");
const softwareNext = document.getElementById("software-next");
const softwarePosition = document.getElementById("software-position");
const portraitTerminal = document.getElementById("portrait-terminal");
const canvas = document.getElementById("hero-canvas");
const context = canvas.getContext("2d", { alpha: true });
const revealNodes = Array.from(document.querySelectorAll(".reveal"));
const terminalModules = Array.from(document.querySelectorAll(".terminal-module"));
const skillTrack = document.getElementById("skills-track");
const railElements = Array.from(document.querySelectorAll(".skills-carousel, .project-rail"));
const projectPreviewImages = Array.from(document.querySelectorAll(".project-preview img"));
const coarsePointerQuery = window.matchMedia("(hover: none), (pointer: coarse)");

const bootTuning = {
  portraitDelay: 40,
  portraitBuildDuration: 1320,
  introDelayAfterBuild: 48,
  introStartProgress: 0.2,
  textDelayGap: 260,
  typingSpeed: 118,
};

const portraitTuning = {
  stepDesktop: 4,
  stepMobile: 3,
  alphaThreshold: 22,
  darkThreshold: 166,
  fadeThreshold: 218,
  edgeFade: 0.18,
  edgeParticleChance: 0.74,
  edgeParticleSpread: 28,
  edgeParticleAlpha: 0.42,
  edgeParticleDrift: 1.85,
  repelRadius: 146,
  repelForce: 16,
  ease: 0.1,
  drift: 0.28,
  widthRatio: 1.03,
  heightRatio: 1.1,
  glowAlpha: 0.08,
  buildBitDensity: 1,
  buildSpread: 190,
  buildWindow: 0.26,
};

const revealTuning = {
  stepDelay: 85,
  duration: 560,
};

const cursorGlowTuning = {
  intensity: 0.64,
  lerp: 0.16,
  spawnRate: 3,
  maxParticles: 56,
  lifeMin: 12,
  lifeMax: 24,
  sizeMin: 1,
  sizeMax: 2.2,
  drift: 0.08,
};

const edgeScrollTuning = {
  smoothness: 0.18,
  arrowStepRatio: 0.82,
};

const railAnimationTuning = {
  duration: 320,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  offset: 20,
};

const railLoopTuning = {
  settleDelay: 120,
};

const pointerState = {
  x: 0,
  y: 0,
  active: false,
  strength: 0,
};

const cursorState = {
  currentX: window.innerWidth * 0.5,
  currentY: window.innerHeight * 0.5,
  targetX: window.innerWidth * 0.5,
  targetY: window.innerHeight * 0.5,
  visible: false,
  velocityX: 0,
  velocityY: 0,
};

const railStates = new WeakMap();
const sourceImage = new Image();
const sourceCanvas = document.createElement("canvas");
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
const portraitDots = [];
const edgeDots = [];
const focusNodes = [];
const cursorParticles = [];
let skillCells = [];
let skillOriginalCount = 0;
let activeSkillCell = null;

const embeddedPortraitSource =
  typeof window.__PORTRAIT_IMAGE_DATA__ === "string" ? window.__PORTRAIT_IMAGE_DATA__ : "";
const portraitImageCandidates = [
  { label: "images/profile.png", src: "images/profile.png", bustCache: true },
  { label: "embedded profile", src: embeddedPortraitSource },
  { label: "images/profile.jpg", src: "images/profile.jpg", bustCache: true },
  { label: "images/photo.jpg", src: "images/photo.jpg", bustCache: true },
].filter((candidate) => Boolean(candidate.src));

const buildState = {
  progress: 0,
  target: 0,
  readyToType: false,
  completed: false,
};

let canvasWidth = 0;
let canvasHeight = 0;
let portraitReady = false;
let portraitBounds = { x: 0, y: 0, width: 0, height: 0 };
let portraitCandidateIndex = 0;
let currentPalette = getThemePalette();
let bootSequenceStarted = false;
let portraitFallbackTriggered = false;

yearElement.textContent = String(new Date().getFullYear());
assignRevealDelays();
initializeTheme();
initializeMenu();
initializeRevealObserver();
initializePreviewFallbacks();
initializeCursorGlow();
initializeSkillsRail();
initializeProjectRails();
initializePortraitTilt();
initializePortraitLoading();
initializeBootSequence();

window.addEventListener("resize", () => {
  resizeCanvas();
  resizeCursorParticlesCanvas();
  updateActiveSkill();
  syncRails();
});

window.requestAnimationFrame(renderLoop);

function assignRevealDelays() {
  terminalModules.forEach((node, index) => {
    node.style.setProperty("--reveal-delay", `${index * revealTuning.stepDelay}ms`);
  });
}

function initializeTheme() {
  const storedTheme = localStorage.getItem("portfolio-theme");
  const initialTheme = storedTheme === "light" ? "light" : "dark";
  applyTheme(initialTheme);

  themeToggle.addEventListener("click", () => {
    const nextTheme = body.dataset.theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  body.dataset.theme = theme;
  localStorage.setItem("portfolio-theme", theme);
  themeToggle.setAttribute("aria-pressed", String(theme === "light"));
  currentPalette = getThemePalette();
}

function getThemePalette() {
  const styles = getComputedStyle(body);

  return {
    text: styles.getPropertyValue("--text").trim(),
    muted: styles.getPropertyValue("--muted").trim(),
    accent: styles.getPropertyValue("--accent").trim(),
    accentSoft: styles.getPropertyValue("--accent-soft").trim(),
  };
}

function initializeMenu() {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    if (navMenu.contains(event.target) || navToggle.contains(event.target)) {
      return;
    }

    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
}

function initializeBootSequence() {
  bootLeft.textContent = "";
  bootRight.textContent = "";
  portraitTerminal.classList.remove("boot-assembling");
  bootModule.classList.add("is-visible");

  window.setTimeout(() => {
    portraitTerminal.classList.add("boot-assembling");
    bootSequenceStarted = true;
    buildState.target = 1;
  }, bootTuning.portraitDelay);
}

function runIntroTyping() {
  if (buildState.readyToType) {
    return;
  }

  buildState.readyToType = true;
  body.classList.add("intro-ready");
  flushDeferredReveals();

  window.setTimeout(() => {
    typeLine(bootLeft, "hello", bootTuning.typingSpeed)
      .then(() => wait(bootTuning.textDelayGap))
      .then(() => typeLine(bootRight, "i'm zy!", bootTuning.typingSpeed))
      .then(() => {
        scheduleRecurringGlitch(bootLeft);
        scheduleRecurringGlitch(bootRight);
      })
      .catch(() => {});
  }, bootTuning.introDelayAfterBuild);
}

function typeLine(target, text, speed) {
  return new Promise((resolve) => {
    let index = 0;
    const tick = () => {
      target.textContent = text.slice(0, index);
      target.dataset.text = target.textContent;
      index += 1;

      if (index <= text.length) {
        window.setTimeout(tick, speed);
        return;
      }

      target.dataset.text = text;
      target.classList.add("is-complete");
      resolve();
    };

    tick();
  });
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function scheduleRecurringGlitch(target) {
  if (!target) {
    return;
  }

  const queueNext = () => {
    const nextDelay = 2600 + Math.random() * 4200;
    window.setTimeout(() => {
      if (!target.textContent.trim()) {
        queueNext();
        return;
      }

      target.classList.add("is-glitching");
      window.setTimeout(() => {
        target.classList.remove("is-glitching");
        queueNext();
      }, 180 + Math.random() * 70);
    }, nextDelay);
  };

  queueNext();
}

function initializeRevealObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!body.classList.contains("intro-ready")) {
          return;
        }

        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealNodes.forEach((node) => {
    if (node === bootModule) {
      node.classList.add("is-visible");
      return;
    }

    observer.observe(node);
  });
}

function flushDeferredReveals() {
  revealNodes.forEach((node) => {
    if (node === bootModule || node.classList.contains("is-visible")) {
      return;
    }

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      node.classList.add("is-visible");
    }
  });
}

function initializeCursorGlow() {
  resizeCursorParticlesCanvas();

  document.addEventListener("pointermove", (event) => {
    cursorState.velocityX = event.clientX - cursorState.targetX;
    cursorState.velocityY = event.clientY - cursorState.targetY;
    cursorState.targetX = event.clientX;
    cursorState.targetY = event.clientY;
    cursorState.visible = !coarsePointerQuery.matches;
    pointerState.x = event.clientX - canvas.getBoundingClientRect().left;
    pointerState.y = event.clientY - canvas.getBoundingClientRect().top;
    spawnCursorParticles(event.clientX, event.clientY);
  });

  document.addEventListener("pointerleave", () => {
    cursorState.visible = false;
    pointerState.active = false;
  });
}

function initializePreviewFallbacks() {
  projectPreviewImages.forEach((image) => {
    image.addEventListener("error", () => {
      image.closest(".project-preview")?.classList.add("is-missing");
    });
  });
}

function initializeSkillsRail() {
  initializeLoopingRail(skillTrack, {
    prevButton: skillsPrev,
    nextButton: skillsNext,
    labelNode: null,
    visibleCount: 5,
  });
}

function initializeProjectRails() {
  [
    {
      rail: document.getElementById("dashboard-track"),
      prevButton: dashboardPrev,
      nextButton: dashboardNext,
      labelNode: dashboardPosition,
      visibleCount: 3,
    },
    {
      rail: document.getElementById("software-track"),
      prevButton: softwarePrev,
      nextButton: softwareNext,
      labelNode: softwarePosition,
      visibleCount: 3,
    },
  ].forEach(({ rail, prevButton, nextButton, labelNode, visibleCount }) => {
    initializeLoopingRail(rail, {
      prevButton,
      nextButton,
      labelNode,
      visibleCount,
    });
  });
}

function initializeLoopingRail(rail, options = {}) {
  if (!rail) {
    return;
  }

  const railState = {
    currentIndex: 0,
    physicalIndex: 0,
    originalCount: 0,
    cloneCount: 0,
    visibleCount: Math.max(1, options.visibleCount || 1),
    settleTimer: null,
    itemStep: 0,
    totalSpan: 0,
    isAdjusting: false,
    labelNode: options.labelNode || null,
  };

  railStates.set(rail, railState);
  rebuildLoopingRail(rail, 0);

  rail.addEventListener("scroll", throttle(() => {
    if (railState.isAdjusting) {
      return;
    }

    syncRailStateFromScroll(rail, railState);
    updateRailUI(rail, railState);
    queueRailSettle(rail, railState);
  }, 60));

  options.prevButton?.addEventListener("click", () => moveRailByItem(rail, -1));
  options.nextButton?.addEventListener("click", () => moveRailByItem(rail, 1));
}

function getRailItems(rail) {
  if (rail === skillTrack) {
    return Array.from(rail.querySelectorAll(".skill-cell"));
  }

  return Array.from(rail.querySelectorAll(".display-card"));
}

function getOriginalRailItems(rail) {
  return getRailItems(rail).filter((item) => item.dataset.clone !== "true");
}

function createRailClone(item) {
  const clone = item.cloneNode(true);
  clone.dataset.clone = "true";
  clone.setAttribute("aria-hidden", "true");
  return clone;
}

function rebuildLoopingRail(rail, preserveIndex = 0) {
  const railState = railStates.get(rail);
  if (!railState) {
    return;
  }

  Array.from(rail.querySelectorAll('[data-clone="true"]')).forEach((item) => item.remove());

  const originals = getOriginalRailItems(rail);
  if (originals.length === 0) {
    return;
  }

  originals.forEach((item, index) => {
    item.dataset.clone = "false";
    item.dataset.railIndex = String(index);
    if (rail === skillTrack) {
      item.dataset.skillIndex = String(index);
    }
  });

  railState.originalCount = originals.length;
  railState.cloneCount = Math.min(railState.visibleCount, originals.length);

  const prependClones = originals.slice(-railState.cloneCount).map((item) => createRailClone(item));
  const appendClones = originals.slice(0, railState.cloneCount).map((item) => createRailClone(item));

  prependClones.forEach((clone) => rail.prepend(clone));
  appendClones.forEach((clone) => rail.append(clone));

  if (rail === skillTrack) {
    skillCells = Array.from(rail.querySelectorAll(".skill-cell"));
    skillOriginalCount = originals.length;
  }

  measureRailGeometry(rail, railState);
  railState.currentIndex = mod(preserveIndex, railState.originalCount);
  railState.physicalIndex = railState.cloneCount + railState.currentIndex;
  scrollRailToPhysicalIndex(rail, railState.physicalIndex, "auto");
  updateRailUI(rail, railState);
}

function measureRailGeometry(rail, railState) {
  const items = getRailItems(rail);
  if (!railState || items.length === 0) {
    return;
  }

  if (items.length > 1) {
    railState.itemStep = items[1].offsetLeft - items[0].offsetLeft;
  } else {
    railState.itemStep = items[0].offsetWidth;
  }

  railState.totalSpan = railState.itemStep * railState.originalCount;
}

function queueRailSettle(rail, railState) {
  window.clearTimeout(railState.settleTimer);
  railState.settleTimer = window.setTimeout(() => {
    finalizeRailPosition(rail);
  }, railLoopTuning.settleDelay);
}

function getNearestPhysicalIndex(rail) {
  const items = getRailItems(rail);
  if (items.length === 0) {
    return 0;
  }

  const scrollLeft = rail.scrollLeft;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  items.forEach((item, index) => {
    const distance = Math.abs(item.offsetLeft - scrollLeft);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function syncRailStateFromScroll(rail, railState = railStates.get(rail)) {
  if (!railState || railState.originalCount === 0) {
    return;
  }

  const nextPhysicalIndex = getNearestPhysicalIndex(rail);
  railState.physicalIndex = nextPhysicalIndex;
  railState.currentIndex = mod(nextPhysicalIndex - railState.cloneCount, railState.originalCount);
}

function scrollRailToPhysicalIndex(rail, physicalIndex, behavior = "smooth") {
  const items = getRailItems(rail);
  const targetItem = items[physicalIndex];
  const railState = railStates.get(rail);

  if (!targetItem || !railState) {
    return;
  }

  railState.physicalIndex = physicalIndex;
  rail.scrollTo({
    left: targetItem.offsetLeft,
    behavior,
  });

  if (behavior === "auto") {
    rail.scrollLeft = targetItem.offsetLeft;
  }
}

function moveRailByItem(rail, direction) {
  const railState = railStates.get(rail);
  if (!railState || railState.originalCount === 0) {
    return;
  }

  railState.currentIndex = mod(railState.currentIndex + direction, railState.originalCount);
  railState.physicalIndex += direction;
  scrollRailToPhysicalIndex(rail, railState.physicalIndex, "smooth");
  updateRailUI(rail, railState);
}

function normalizeRailScrollPosition(rail, railState = railStates.get(rail)) {
  if (!railState || railState.originalCount === 0) {
    return false;
  }

  const lowerBound = railState.cloneCount;
  const upperBound = railState.cloneCount + railState.originalCount - 1;

  if (railState.physicalIndex < lowerBound || railState.physicalIndex > upperBound) {
    const offset = railState.physicalIndex < lowerBound ? railState.totalSpan : -railState.totalSpan;
    railState.isAdjusting = true;
    const previousScrollBehavior = rail.style.scrollBehavior;
    rail.style.scrollBehavior = "auto";
    rail.scrollLeft += offset;
    rail.style.scrollBehavior = previousScrollBehavior;
    railState.isAdjusting = false;
    railState.physicalIndex += railState.physicalIndex < lowerBound ? railState.originalCount : -railState.originalCount;
    return true;
  }

  return false;
}

function finalizeRailPosition(rail) {
  const railState = railStates.get(rail);
  if (!railState || railState.originalCount === 0) {
    return;
  }

  syncRailStateFromScroll(rail, railState);
  normalizeRailScrollPosition(rail, railState);
  syncRailStateFromScroll(rail, railState);
  updateRailUI(rail, railState);
}

function syncRails() {
  railElements.forEach((rail) => {
    const railState = railStates.get(rail);
    if (!railState) {
      return;
    }

    rebuildLoopingRail(rail, railState.currentIndex);
  });
}

function moveSkillsBy(direction) {
  moveRailByItem(skillTrack, direction);
}

function getRailActiveOffset(railState) {
  if (!railState || railState.originalCount === 0) {
    return 0;
  }

  const visibleCount = Math.min(railState.visibleCount, railState.originalCount);
  return Math.floor((visibleCount - 1) * 0.5);
}

function updateActiveSkill() {
  const railState = railStates.get(skillTrack);
  if (!railState || railState.originalCount === 0) {
    return;
  }

  const activeCell =
    getRailItems(skillTrack)[railState.physicalIndex + getRailActiveOffset(railState)] || null;

  if (activeCell === activeSkillCell) {
    return;
  }

  activeSkillCell = activeCell;
  skillCells.forEach((cell) => {
    cell.classList.toggle("is-active", cell === activeCell);
    cell.classList.remove("is-meter-animating");
  });

  if (activeCell) {
    void activeCell.offsetWidth;
    activeCell.classList.add("is-meter-animating");
  }
}

function updateRailHighlight(rail, railState = railStates.get(rail)) {
  if (!railState || railState.originalCount === 0) {
    return;
  }

  const activeItem =
    getRailItems(rail)[railState.physicalIndex + getRailActiveOffset(railState)] || null;
  getRailItems(rail).forEach((item) => {
    item.classList.toggle("is-active", item === activeItem);
  });
}

function updateRailPositionLabel(labelNode, railState) {
  if (!labelNode || !railState || railState.originalCount === 0) {
    return;
  }

  labelNode.textContent = `${railState.currentIndex + 1} of ${railState.originalCount}`;
}

function updateRailUI(rail, railState = railStates.get(rail)) {
  if (rail === skillTrack) {
    updateActiveSkill();
    return;
  }

  updateRailHighlight(rail, railState);
  updateRailPositionLabel(railState?.labelNode, railState);
}

function mod(value, divisor) {
  if (!divisor) {
    return 0;
  }

  return ((value % divisor) + divisor) % divisor;
}

function initializePortraitTilt() {
  portraitTerminal.addEventListener("pointermove", (event) => {
    if (coarsePointerQuery.matches) {
      return;
    }

    const bounds = portraitTerminal.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

    pointerState.active = true;
    pointerState.x = event.clientX - canvas.getBoundingClientRect().left;
    pointerState.y = event.clientY - canvas.getBoundingClientRect().top;
    portraitTerminal.style.transform = `perspective(1400px) rotateX(${offsetY * -1.6}deg) rotateY(${offsetX * 2.1}deg)`;
  });

  portraitTerminal.addEventListener("pointerleave", () => {
    pointerState.active = false;
    portraitTerminal.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg)";
  });
}

function initializePortraitLoading() {
  sourceImage.decoding = "async";

  sourceImage.addEventListener("load", () => {
    portraitReady = true;
    resizeCanvas();
  });

  sourceImage.addEventListener("error", () => {
    portraitCandidateIndex += 1;

    if (portraitCandidateIndex < portraitImageCandidates.length) {
      sourceImage.src = getPortraitCandidateSrc(portraitImageCandidates[portraitCandidateIndex]);
      return;
    }

    portraitReady = false;
    runIntroTyping();
  });

  sourceImage.src = getPortraitCandidateSrc(portraitImageCandidates[portraitCandidateIndex]);
}

function getPortraitCandidateSrc(candidate) {
  if (!candidate?.src) {
    return "";
  }

  if (!candidate.bustCache) {
    return candidate.src;
  }

  const separator = candidate.src.includes("?") ? "&" : "?";
  return `${candidate.src}${separator}v=${Date.now()}`;
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvasWidth = Math.max(1, bounds.width);
  canvasHeight = Math.max(1, bounds.height);
  canvas.width = Math.floor(canvasWidth * ratio);
  canvas.height = Math.floor(canvasHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  if (portraitReady) {
    buildPortraitMap();
  }
}

function buildPortraitMap() {
  const imageAspect = sourceImage.naturalWidth / sourceImage.naturalHeight || 1;
  const maxWidth = canvasWidth * portraitTuning.widthRatio;
  const maxHeight = canvasHeight * portraitTuning.heightRatio;
  let width = maxWidth;
  let height = width / imageAspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * imageAspect;
  }

  width = Math.max(1, Math.floor(width));
  height = Math.max(1, Math.floor(height));

  portraitBounds = {
    x: Math.round((canvasWidth - width) * 0.5),
    y: Math.round((canvasHeight - height) * 0.5),
    width,
    height,
  };

  sourceCanvas.width = width;
  sourceCanvas.height = height;
  sourceContext.clearRect(0, 0, width, height);
  sourceContext.drawImage(sourceImage, 0, 0, width, height);

  const baseStep = canvasWidth <= 640 ? portraitTuning.stepMobile : portraitTuning.stepDesktop;
  const sampleStep = Math.max(2, Math.round(baseStep / Math.max(0.75, portraitTuning.buildBitDensity)));
  let data;

  try {
    data = sourceContext.getImageData(0, 0, width, height).data;
  } catch (error) {
    if (tryNextPortraitCandidate()) {
      return;
    }

    portraitReady = false;
    portraitDots.length = 0;
    edgeDots.length = 0;
    focusNodes.length = 0;
    runIntroTyping();
    return;
  }

  portraitDots.length = 0;
  edgeDots.length = 0;
  focusNodes.length = 0;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];

      if (alpha < portraitTuning.alphaThreshold) {
        continue;
      }

      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const brightness = red * 0.299 + green * 0.587 + blue * 0.114;

      if (brightness > portraitTuning.fadeThreshold) {
        continue;
      }

      const darkness = 1 - brightness / 255;
      const localX = portraitBounds.x + x;
      const localY = portraitBounds.y + y;
      const fade = getPortraitFade(x, y, width, height);
      const sourcePoint = getBuildSourcePoint((x + y) / Math.max(1, width + height));
      const revealOffset = clamp((y / Math.max(1, height)) * 0.42 + Math.random() * 0.22 + (1 - fade) * 0.16, 0, 0.84);

      if (fade <= 0.02) {
        continue;
      }

      portraitDots.push({
        baseX: localX,
        baseY: localY,
        sourceX: sourcePoint.x,
        sourceY: sourcePoint.y,
        x: buildState.completed ? localX : sourcePoint.x,
        y: buildState.completed ? localY : sourcePoint.y,
        radius: 0.75 + darkness * 1.75,
        brightness,
        alpha: (0.18 + darkness * 0.42) * fade,
        drift: darkness * portraitTuning.drift,
        phase: x * 0.05 + y * 0.035,
        revealOffset,
      });

      if (fade < 0.72 && Math.random() < portraitTuning.edgeParticleChance * (1 - fade * 0.72)) {
        const edgeSource = getBuildSourcePoint((x * 0.65 + y * 0.35) / Math.max(1, width + height));
        edgeDots.push({
          baseX: localX,
          baseY: localY,
          sourceX: edgeSource.x,
          sourceY: edgeSource.y,
          x: buildState.completed ? localX : edgeSource.x,
          y: buildState.completed ? localY : edgeSource.y,
          radius: 0.45 + darkness * 1.15,
          alpha: (portraitTuning.edgeParticleAlpha + darkness * 0.16) * (1 - fade * 0.58),
          spread: portraitTuning.edgeParticleSpread * (1 - fade),
          drift: portraitTuning.edgeParticleDrift + darkness * 0.85,
          phase: x * 0.02 + y * 0.028,
          revealOffset: clamp(revealOffset + 0.06 + Math.random() * 0.14, 0, 0.98),
        });
      }

      if (brightness < portraitTuning.darkThreshold && x % 18 === 0 && y % 18 === 0 && fade > 0.28) {
        focusNodes.push({
          x: localX,
          y: localY,
          size: 1.2 + darkness * 1.2,
          alpha: (0.16 + darkness * 0.18) * fade,
          phase: (x + y) * 0.012,
        });
      }
    }
  }
}

function tryNextPortraitCandidate() {
  if (portraitFallbackTriggered) {
    return false;
  }

  portraitCandidateIndex += 1;

  if (portraitCandidateIndex >= portraitImageCandidates.length) {
    return false;
  }

  portraitFallbackTriggered = true;
  portraitReady = false;
  sourceImage.src = getPortraitCandidateSrc(portraitImageCandidates[portraitCandidateIndex]);
  return true;
}

function getBuildSourcePoint(progress) {
  const side = Math.floor(Math.random() * 4);
  const spread = portraitTuning.buildSpread;

  if (side === 0) {
    return {
      x: -spread + Math.random() * canvasWidth * 0.32,
      y: canvasHeight * progress,
    };
  }

  if (side === 1) {
    return {
      x: canvasWidth + spread - Math.random() * canvasWidth * 0.32,
      y: canvasHeight * progress,
    };
  }

  if (side === 2) {
    return {
      x: canvasWidth * progress,
      y: -spread + Math.random() * canvasHeight * 0.24,
    };
  }

  return {
    x: canvasWidth * progress,
    y: canvasHeight + spread - Math.random() * canvasHeight * 0.2,
  };
}

function getPortraitFade(x, y, width, height) {
  const edgeDistance = Math.min(x, y, width - x, height - y);
  const fadeDistance = Math.max(8, Math.min(width, height) * portraitTuning.edgeFade);
  const baseFade = clamp(edgeDistance / fadeDistance, 0, 1);
  const sideDistance = Math.min(x, width - x);
  const sideFadeDistance = Math.max(28, width * 0.22);
  const sideFade = easeOutQuad(clamp(sideDistance / sideFadeDistance, 0, 1));
  const bottomDistance = height - y;
  const bottomFadeDistance = Math.max(30, height * 0.24);
  const bottomFade = easeOutQuad(clamp(bottomDistance / bottomFadeDistance, 0, 1));

  return baseFade * sideFade * bottomFade;
}

function renderLoop(timestamp) {
  const time = timestamp * 0.001;
  pointerState.strength += ((pointerState.active ? 1 : 0) - pointerState.strength) * 0.08;
  updateBuildProgress();
  animateCursorParticles();
  animateRails();
  renderPortrait(time);
  window.requestAnimationFrame(renderLoop);
}

function updateBuildProgress() {
  if (!bootSequenceStarted || !portraitReady || portraitDots.length === 0) {
    return;
  }

  const buildEase = 1 - Math.exp(-1 / Math.max(1, bootTuning.portraitBuildDuration / 16));
  buildState.progress += (buildState.target - buildState.progress) * buildEase;

  if (!buildState.readyToType && buildState.progress >= bootTuning.introStartProgress) {
    runIntroTyping();
  }

  if (!buildState.completed && buildState.progress >= 0.992) {
    buildState.progress = 1;
    buildState.completed = true;
  }
}

function resizeCursorParticlesCanvas() {
  const ratio = window.devicePixelRatio || 1;
  cursorParticlesCanvas.width = Math.floor(window.innerWidth * ratio);
  cursorParticlesCanvas.height = Math.floor(window.innerHeight * ratio);
  cursorParticlesCanvas.style.width = `${window.innerWidth}px`;
  cursorParticlesCanvas.style.height = `${window.innerHeight}px`;
  cursorParticlesContext.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function spawnCursorParticles(x, y) {
  if (coarsePointerQuery.matches || !cursorState.visible) {
    return;
  }

  const speed = Math.min(10, Math.hypot(cursorState.velocityX, cursorState.velocityY));
  const spawnCount = Math.max(1, Math.round(cursorGlowTuning.spawnRate + speed * 0.18));

  for (let index = 0; index < spawnCount; index += 1) {
    if (cursorParticles.length >= cursorGlowTuning.maxParticles) {
      cursorParticles.shift();
    }

    const spread = 8 + speed * 0.8;
    cursorParticles.push({
      x: x + (Math.random() - 0.5) * spread,
      y: y + (Math.random() - 0.5) * spread,
      vx: -cursorState.velocityX * (0.05 + Math.random() * 0.03) + (Math.random() - 0.5) * 0.18,
      vy: -cursorState.velocityY * (0.05 + Math.random() * 0.03) + (Math.random() - 0.5) * 0.18,
      life: cursorGlowTuning.lifeMin + Math.random() * (cursorGlowTuning.lifeMax - cursorGlowTuning.lifeMin),
      maxLife: 0,
      size: cursorGlowTuning.sizeMin + Math.random() * (cursorGlowTuning.sizeMax - cursorGlowTuning.sizeMin),
    });

    cursorParticles[cursorParticles.length - 1].maxLife = cursorParticles[cursorParticles.length - 1].life;
  }
}

function animateCursorParticles() {
  cursorState.currentX += (cursorState.targetX - cursorState.currentX) * cursorGlowTuning.lerp;
  cursorState.currentY += (cursorState.targetY - cursorState.currentY) * cursorGlowTuning.lerp;

  cursorParticlesContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

  if (coarsePointerQuery.matches) {
    cursorParticles.length = 0;
    return;
  }

  for (let index = cursorParticles.length - 1; index >= 0; index -= 1) {
    const particle = cursorParticles[index];
    particle.life -= 1;

    if (particle.life <= 0) {
      cursorParticles.splice(index, 1);
      continue;
    }

    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.95;
    particle.vy *= 0.95;
    particle.vy += (Math.random() - 0.5) * cursorGlowTuning.drift;

    const progress = particle.life / particle.maxLife;
    const alpha = progress * progress * cursorGlowTuning.intensity;
    cursorParticlesContext.fillStyle = withAlpha(currentPalette.accent, alpha);
    const size = particle.size * (0.9 + progress * 0.25);
    cursorParticlesContext.fillRect(particle.x - size * 0.5, particle.y - size * 0.5, size, size);
  }

  if (cursorState.visible) {
    const gridAlpha = 0.06 * cursorGlowTuning.intensity;
    const snappedX = Math.round(cursorState.currentX / 18) * 18;
    const snappedY = Math.round(cursorState.currentY / 18) * 18;
    cursorParticlesContext.strokeStyle = withAlpha(currentPalette.accent, gridAlpha);
    cursorParticlesContext.lineWidth = 1;
    cursorParticlesContext.beginPath();
    cursorParticlesContext.moveTo(snappedX - 18, snappedY);
    cursorParticlesContext.lineTo(snappedX + 18, snappedY);
    cursorParticlesContext.moveTo(snappedX, snappedY - 18);
    cursorParticlesContext.lineTo(snappedX, snappedY + 18);
    cursorParticlesContext.stroke();
  }
}

function animateRails() {
  railElements.forEach((rail) => {
    const state = railStates.get(rail);
    if (!state) {
      return;
    }

    if (rail === skillTrack) {
      updateActiveSkill();
    }
  });
}

function renderPortrait(time) {
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  drawCanvasBackdrop();

  if (portraitReady && portraitDots.length > 0) {
    drawPortraitPhoto(time);
    drawEdgeDots(time);
    drawPortraitOverlay(time);
  } else {
    drawFallbackMessage();
  }
}

function drawCanvasBackdrop() {
  context.save();

  for (let x = 0; x <= canvasWidth; x += 24) {
    context.strokeStyle = withAlpha(currentPalette.accent, 0.026);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvasHeight);
    context.stroke();
  }

  for (let y = 0; y <= canvasHeight; y += 24) {
    context.strokeStyle = withAlpha(currentPalette.accent, 0.022);
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvasWidth, y);
    context.stroke();
  }

  const radialGlow = context.createRadialGradient(
    canvasWidth * 0.5,
    canvasHeight * 0.48,
    0,
    canvasWidth * 0.5,
    canvasHeight * 0.48,
    canvasWidth * 0.5
  );
  radialGlow.addColorStop(0, withAlpha(currentPalette.accent, portraitTuning.glowAlpha));
  radialGlow.addColorStop(0.58, withAlpha(currentPalette.accent, 0.022));
  radialGlow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = radialGlow;
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.restore();
}

function drawPortraitPhoto(time) {
  const buildProgress = easeOutCubic(buildState.progress);

  portraitDots.forEach((dot) => {
    const localBuild = clamp((buildProgress - dot.revealOffset) / portraitTuning.buildWindow, 0, 1);

    if (localBuild <= 0) {
      return;
    }

    const settle = easeOutCubic(localBuild);
    const steady = easeOutQuad(clamp((localBuild - 0.72) / 0.28, 0, 1));
    const jitterX = Math.sin(time * 1.2 + dot.phase) * dot.drift;
    const jitterY = Math.cos(time * 1.05 + dot.phase) * dot.drift * 0.55;
    const repel = getPointerRepel(dot.baseX, dot.baseY);
    const buildX = dot.sourceX + (dot.baseX - dot.sourceX) * settle;
    const buildY = dot.sourceY + (dot.baseY - dot.sourceY) * settle;
    const targetX = buildX + (jitterX + repel.x) * steady;
    const targetY = buildY + (jitterY + repel.y) * steady;

    dot.x += (targetX - dot.x) * (localBuild < 1 ? 0.18 : portraitTuning.ease);
    dot.y += (targetY - dot.y) * (localBuild < 1 ? 0.18 : portraitTuning.ease);

    const tone = dot.brightness < portraitTuning.darkThreshold ? currentPalette.text : currentPalette.accent;
    context.fillStyle = withAlpha(tone, dot.alpha * (0.38 + localBuild * 0.62) * (1 + pointerState.strength * 0.08));
    context.beginPath();
    context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
    context.fill();

    if (localBuild < 0.96) {
      context.strokeStyle = withAlpha(currentPalette.accent, (1 - localBuild) * 0.08);
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(dot.sourceX, dot.sourceY);
      context.lineTo(dot.x, dot.y);
      context.stroke();
    }
  });
}

function drawEdgeDots(time) {
  const buildProgress = easeOutCubic(buildState.progress);

  edgeDots.forEach((dot) => {
    const localBuild = clamp((buildProgress - dot.revealOffset) / (portraitTuning.buildWindow * 0.88), 0, 1);

    if (localBuild <= 0) {
      return;
    }

    const settle = easeOutCubic(localBuild);
    const steady = easeOutQuad(clamp((localBuild - 0.62) / 0.38, 0, 1));
    const shimmerX = Math.sin(time * 0.92 + dot.phase) * dot.spread;
    const shimmerY = Math.cos(time * 0.86 + dot.phase) * dot.spread * 0.68;
    const edgeDriftX = Math.sin(time * (0.48 + dot.drift * 0.06) + dot.phase * 1.6) * dot.drift * 4.8;
    const edgeDriftY = Math.cos(time * (0.42 + dot.drift * 0.05) + dot.phase * 1.2) * dot.drift * 2.4;
    const repel = getPointerRepel(dot.baseX, dot.baseY);
    const buildX = dot.sourceX + (dot.baseX - dot.sourceX) * settle;
    const buildY = dot.sourceY + (dot.baseY - dot.sourceY) * settle;
    const targetX = buildX + (shimmerX + edgeDriftX + repel.x * 0.36) * steady;
    const targetY = buildY + (shimmerY + edgeDriftY + repel.y * 0.36) * steady;

    dot.x += (targetX - dot.x) * (localBuild < 1 ? 0.14 : 0.08);
    dot.y += (targetY - dot.y) * (localBuild < 1 ? 0.14 : 0.08);

    const pulse = 0.82 + Math.sin(time * 1.6 + dot.phase * 2.2) * 0.18;
    context.fillStyle = withAlpha(currentPalette.accent, dot.alpha * localBuild * pulse);
    context.beginPath();
    context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
    context.fill();
  });
}

function drawPortraitOverlay(time) {
  const buildAlpha = easeOutQuad(clamp((buildState.progress - 0.24) / 0.76, 0, 1));

  focusNodes.forEach((node, index) => {
    const pulse = 0.9 + Math.sin(time * 1.6 + node.phase + index * 0.18) * 0.12;
    context.fillStyle = withAlpha(currentPalette.accent, node.alpha * pulse * buildAlpha);
    context.beginPath();
    context.arc(node.x, node.y, node.size * pulse, 0, Math.PI * 2);
    context.fill();
  });
}

function getPointerRepel(baseX, baseY) {
  if (!pointerState.active && pointerState.strength < 0.01) {
    return { x: 0, y: 0 };
  }

  const dx = baseX - pointerState.x;
  const dy = baseY - pointerState.y;
  const distance = Math.hypot(dx, dy) || 1;

  if (distance > portraitTuning.repelRadius) {
    return { x: 0, y: 0 };
  }

  const force = (1 - distance / portraitTuning.repelRadius) * portraitTuning.repelForce * pointerState.strength;
  const angle = Math.atan2(dy, dx);

  return {
    x: Math.cos(angle) * force,
    y: Math.sin(angle) * force,
  };
}

function drawFallbackMessage() {
  context.save();
  context.fillStyle = currentPalette.text;
  context.font = '28px "Share Tech Mono", monospace';
  context.textAlign = "center";
  context.fillText("portrait unavailable", canvasWidth * 0.5, canvasHeight * 0.48);
  context.fillStyle = currentPalette.muted;
  context.font = '16px "Share Tech Mono", monospace';
  context.fillText("check portrait-image-data.js or images/profile.png", canvasWidth * 0.5, canvasHeight * 0.55);
  context.restore();
}

function withAlpha(color, alpha) {
  if (color.startsWith("rgba")) {
    return color;
  }

  const rgb = hexToRgb(color);

  if (!rgb) {
    return `rgba(54, 196, 0, ${alpha})`;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "").trim();
  const normalized = clean.length === 3
    ? clean.split("").map((character) => character + character).join("")
    : clean;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeOutQuad(value) {
  return 1 - (1 - value) * (1 - value);
}

function throttle(callback, wait) {
  let timeoutId = null;

  return (...args) => {
    if (timeoutId !== null) {
      return;
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      callback(...args);
    }, wait);
  };
}
