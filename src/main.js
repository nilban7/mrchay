import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as THREE from 'three';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 192;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Lenis Smooth Scroll with buttery inertia
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.1,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // 2. Initialize Three.js ambient particles & floating spices (behind overlays)
  initThreeAmbientScene();

  // 3. Noise Canvas Generation (2-3% grain)
  initNoiseCanvas();

  // 4. Custom Ring Cursor & Magnetic Hover
  initCustomCursor();

  // 5. Preload Frame Sequences (Thali, Samosa, Coffee)
  const thaliImages = await preloadFrameSequence('thali', TOTAL_FRAMES, (progress) => {
    updatePreloaderProgress(progress * 0.45, `Loading Thali Mesh (${Math.round(progress * 100)}%)`);
  });

  const samosaImages = await preloadFrameSequence('samosa', TOTAL_FRAMES, (progress) => {
    updatePreloaderProgress(0.45 + progress * 0.35, `Loading Samosa Geometry (${Math.round(progress * 100)}%)`);
  });

  const coffeeImages = await preloadFrameSequence('coffee', TOTAL_FRAMES, (progress) => {
    updatePreloaderProgress(0.80 + progress * 0.20, `Buffering Decoction Canvas (${Math.round(progress * 100)}%)`);
  });

  // Finish preloader
  finishPreloader();

  // 6. Bind GSAP Pinned Scrub Handlers with Smooth Interpolation & Pin Alignment
  initThaliCanvasScrub(thaliImages);
  initSamosaCanvasScrub(samosaImages);
  initCoffeeCanvasScrub(coffeeImages);

  // 7. General Section Animations & Interactions
  initHeroAnimations();
  initCoffeeSection();
  initSweetsSection();
  initGalleryHorizontalScroll();
  initNavScrollState();
});

/* ==========================================================================
   FRAME SEQUENCE PRELOADER (192 High-DPI Frames per section)
   ========================================================================== */
function preloadFrameSequence(type, count, onProgress) {
  return new Promise((resolve) => {
    const images = [];
    let loaded = 0;

    for (let i = 1; i <= count; i++) {
      const img = new Image();
      const paddedIndex = String(i).padStart(4, '0');
      img.src = `/assets/frames/${type}/frame_${paddedIndex}.jpg`;

      img.onload = () => {
        loaded++;
        if (onProgress) onProgress(loaded / count);
        if (loaded === count) resolve(images);
      };

      img.onerror = () => {
        loaded++;
        if (onProgress) onProgress(loaded / count);
        if (loaded === count) resolve(images);
      };

      images.push(img);
    }
  });
}

function updatePreloaderProgress(ratio, label) {
  const progressBar = document.getElementById('progress-bar');
  const statusLabel = document.getElementById('preloader-status');
  if (progressBar) progressBar.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;
  if (statusLabel && label) statusLabel.textContent = label;
}

function finishPreloader() {
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('progress-bar');
  const title = document.getElementById('preloader-title');
  if (!preloader) return;

  if (progressBar) progressBar.style.width = '100%';

  const tl = gsap.timeline({
    delay: 0.2,
    onComplete: () => {
      gsap.to(preloader, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          preloader.style.display = 'none';
          triggerHeroReveal();
        }
      });
    }
  });

  tl.to(title, { y: -10, opacity: 1, duration: 0.3 });
}

/* ==========================================================================
   HIGH-PERFORMANCE CANVAS RENDERER HELPER (High-DPI Fitted)
   ========================================================================== */
function renderFrameToCanvas(canvas, img) {
  if (!canvas || !img || !img.complete) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const displayWidth = canvas.clientWidth || 1920;
  const displayHeight = canvas.clientHeight || 1080;

  if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
  }

  ctx.save();
  ctx.scale(dpr, dpr);

  const imgRatio = (img.naturalWidth || 1920) / (img.naturalHeight || 1080);
  const canvasRatio = displayWidth / displayHeight;

  let drawW, drawH, drawX, drawY;

  if (canvasRatio > imgRatio) {
    drawW = displayWidth;
    drawH = displayWidth / imgRatio;
    drawX = 0;
    drawY = (displayHeight - drawH) / 2;
  } else {
    drawH = displayHeight;
    drawW = displayHeight * imgRatio;
    drawX = (displayWidth - drawW) / 2;
    drawY = 0;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

/* ==========================================================================
   D. THE EXPLODED THALI SCROLL SCRUB (HERO INTERACTION) — TRUE PINNED LOCK
   ========================================================================== */
function initThaliCanvasScrub(images) {
  const section = document.getElementById('what-we-serve');
  const canvas = document.getElementById('thali-canvas');
  const progressFill = document.getElementById('thali-progress-fill');
  const statusLabel = document.getElementById('thali-status-label');

  if (!section || !canvas || !images.length) return;

  renderFrameToCanvas(canvas, images[0]);

  const THALI_MOTION_START = 34; // Frame where dosa and bowls actively lift into zero gravity
  const THALI_TOTAL = images.length - 1; // 191
  let currentFrame = 0;

  function getThaliFrame(p) {
    if (p <= 0.005) return 0; // Frame 0: clean intact assembled thali plate at rest
    // Immediate response: every scroll notch dynamically lifts and bursts the components!
    const mapped = THALI_MOTION_START + p * (THALI_TOTAL - THALI_MOTION_START);
    return Math.min(THALI_TOTAL, Math.max(0, Math.round(mapped)));
  }

  const labels = [
    { el: document.getElementById('label-dosa'), start: 0.10, end: 0.42 },
    { el: document.getElementById('label-sambar'), start: 0.28, end: 0.62 },
    { el: document.getElementById('label-vada'), start: 0.48, end: 0.82 },
    { el: document.getElementById('label-chutney'), start: 0.68, end: 0.98 },
  ];

  window.addEventListener('resize', () => {
    renderFrameToCanvas(canvas, images[currentFrame] || images[0]);
  });

  // TRUE SECTION PIN: Pinned firmly to viewport for exactly 2200px of buttery scroll
  ScrollTrigger.create({
    trigger: section,
    pin: true,
    start: 'top top',
    end: '+=2200',
    scrub: 0.1, // Near-instant 1:1 scrub response with Lenis
    anticipatePin: 1,
    onUpdate: (self) => {
      const p = self.progress;
      const targetFrame = getThaliFrame(p);

      if (targetFrame !== currentFrame) {
        currentFrame = targetFrame;
        renderFrameToCanvas(canvas, images[targetFrame]);
      }

      const percent = Math.round(p * 100);
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (statusLabel) {
        if (p <= 0.05) {
          statusLabel.textContent = `ASSEMBLED THALI (0%)`;
        } else if (p >= 0.95) {
          statusLabel.textContent = `MAXIMUM ZERO-GRAVITY BURST (100%)`;
        } else {
          statusLabel.textContent = `ZERO-GRAVITY EXPLOSION (FRAME ${targetFrame + 1}/${images.length} · ${percent}%)`;
        }
      }

      // Pop Labels Animation precisely timed to the explosion
      labels.forEach(({ el, start, end }) => {
        if (!el) return;
        if (p >= start && p <= end) {
          gsap.to(el, { opacity: 1, scale: 1, y: 0, duration: 0.2, overwrite: 'auto' });
        } else {
          gsap.to(el, { opacity: 0, scale: 0.7, y: 15, duration: 0.18, overwrite: 'auto' });
        }
      });
    }
  });
}

/* ==========================================================================
   D2. EXPLODED SAMOSA SCROLL SCRUB — TRUE PINNED LOCK & INSTANT BURST
   ========================================================================== */
function initSamosaCanvasScrub(images) {
  const section = document.getElementById('samosa-scrub');
  const canvas = document.getElementById('samosa-canvas');
  const progressFill = document.getElementById('samosa-progress-fill');
  const statusLabel = document.getElementById('samosa-status-label');

  if (!section || !canvas || !images.length) return;

  renderFrameToCanvas(canvas, images[0]);

  const SAMOSA_MOTION_START = 40; // Frame where golden shell fractures and bursts
  const SAMOSA_TOTAL = images.length - 1; // 191
  let currentFrame = 0;

  function getSamosaFrame(p) {
    if (p <= 0.005) return 0; // Frame 0: intact golden samosa
    const mapped = SAMOSA_MOTION_START + p * (SAMOSA_TOTAL - SAMOSA_MOTION_START);
    return Math.min(SAMOSA_TOTAL, Math.max(0, Math.round(mapped)));
  }

  const labels = [
    { el: document.getElementById('label-pastry'), start: 0.12, end: 0.46 },
    { el: document.getElementById('label-potatoes'), start: 0.38, end: 0.72 },
    { el: document.getElementById('label-cumin'), start: 0.64, end: 0.98 },
  ];

  window.addEventListener('resize', () => {
    renderFrameToCanvas(canvas, images[currentFrame] || images[0]);
  });

  ScrollTrigger.create({
    trigger: section,
    pin: true,
    start: 'top top',
    end: '+=2200',
    scrub: 0.1,
    anticipatePin: 1,
    onUpdate: (self) => {
      const p = self.progress;
      const targetFrame = getSamosaFrame(p);

      if (targetFrame !== currentFrame) {
        currentFrame = targetFrame;
        renderFrameToCanvas(canvas, images[targetFrame]);
      }

      const percent = Math.round(p * 100);
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (statusLabel) {
        if (p <= 0.05) {
          statusLabel.textContent = `INTACT CRISP GEOMETRY (0%)`;
        } else if (p >= 0.95) {
          statusLabel.textContent = `EXPLODED PASTRY & SPICES (100%)`;
        } else {
          statusLabel.textContent = `RADIAL DECONSTRUCTION (FRAME ${targetFrame + 1}/${images.length} · ${percent}%)`;
        }
      }

      labels.forEach(({ el, start, end }) => {
        if (!el) return;
        if (p >= start && p <= end) {
          gsap.to(el, { opacity: 1, scale: 1, y: 0, duration: 0.2, overwrite: 'auto' });
        } else {
          gsap.to(el, { opacity: 0, scale: 0.7, y: 15, duration: 0.18, overwrite: 'auto' });
        }
      });
    }
  });
}

/* ==========================================================================
   C. COFFEE SECTION CANVAS SCRUB
   ========================================================================== */
function initCoffeeCanvasScrub(images) {
  const canvas = document.getElementById('coffee-canvas');
  const section = document.getElementById('coffee');
  if (!canvas || !section || !images.length) return;

  renderFrameToCanvas(canvas, images[0]);

  let activeFrame = 0;
  ScrollTrigger.create({
    trigger: section,
    start: 'top 75%',
    end: 'bottom 25%',
    scrub: 0.1,
    onUpdate: (self) => {
      const p = self.progress;
      const frameIndex = Math.min(images.length - 1, Math.max(0, Math.floor(p * (images.length - 1))));
      if (frameIndex !== activeFrame) {
        activeFrame = frameIndex;
        renderFrameToCanvas(canvas, images[frameIndex]);
      }
    }
  });
}

/* ==========================================================================
   THREE.JS AMBIENT SCENE (Zero-gravity floating spice particles & steam)
   ========================================================================== */
function initThreeAmbientScene() {
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 25;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xe38a2c, 0.6);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  const spiceGroup = new THREE.Group();
  scene.add(spiceGroup);

  const spiceGeometries = [
    new THREE.DodecahedronGeometry(0.35, 0),
    new THREE.TetrahedronGeometry(0.25, 0),
    new THREE.TorusGeometry(0.3, 0.1, 8, 16)
  ];

  const spiceMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.6, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0x5c8a3a, roughness: 0.5, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.4, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: 0xc23b22, roughness: 0.7, metalness: 0.0 })
  ];

  const spiceMeshes = [];
  const COUNT = 28; // Elegant density

  for (let i = 0; i < COUNT; i++) {
    const geo = spiceGeometries[Math.floor(Math.random() * spiceGeometries.length)];
    const mat = spiceMaterials[Math.floor(Math.random() * spiceMaterials.length)];
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(
      (Math.random() - 0.5) * 36,
      (Math.random() - 0.5) * 24,
      (Math.random() - 0.5) * 15
    );

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    const scale = 0.4 + Math.random() * 0.7;
    mesh.scale.set(scale, scale, scale);

    mesh.userData = {
      rotSpeedX: (Math.random() - 0.5) * 0.012,
      rotSpeedY: (Math.random() - 0.5) * 0.012,
      floatSpeed: 0.004 + Math.random() * 0.006,
      initialY: mesh.position.y
    };

    spiceGroup.add(mesh);
    spiceMeshes.push(mesh);
  }

  let mouseTargetX = 0;
  let mouseTargetY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseTargetX = (e.clientX / window.innerWidth - 0.5) * 1.5;
    mouseTargetY = -(e.clientY / window.innerHeight - 0.5) * 1.5;
  });

  let clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    spiceMeshes.forEach((mesh) => {
      mesh.rotation.x += mesh.userData.rotSpeedX;
      mesh.rotation.y += mesh.userData.rotSpeedY;
      mesh.position.y = mesh.userData.initialY + Math.sin(elapsedTime + mesh.position.x) * 0.6;
    });

    camera.position.x += (mouseTargetX * 2 - camera.position.x) * 0.05;
    camera.position.y += (mouseTargetY * 2 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }
  animate();

  ScrollTrigger.create({
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      spiceGroup.rotation.y = self.progress * Math.PI * 1.2;
      spiceGroup.position.y = self.progress * 8;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ==========================================================================
   NOISE CANVAS GENERATOR (2-3% grain)
   ========================================================================== */
function initNoiseCanvas() {
  const canvas = document.getElementById('noise-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateNoise();
  }

  function generateNoise() {
    const w = canvas.width;
    const h = canvas.height;
    const idata = ctx.createImageData(w, h);
    const buffer32 = new Uint32Array(idata.data.buffer);
    const len = buffer32.length;

    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.1) {
        buffer32[i] = 0x152b2320;
      }
    }
    ctx.putImageData(idata, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);
}

/* ==========================================================================
   CUSTOM RING CURSOR & MAGNETIC EFFECT
   ========================================================================== */
function initCustomCursor() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  });

  gsap.ticker.add(() => {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
  });

  const interactives = document.querySelectorAll('a, button, .magnetic-btn, .magnetic-card');
  interactives.forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('active'));
    el.addEventListener('mouseleave', () => ring.classList.remove('active'));

    if (el.classList.contains('magnetic-btn')) {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.35;
        const deltaY = (e.clientY - centerY) * 0.35;

        gsap.to(el, { x: deltaX, y: deltaY, duration: 0.3, ease: 'power2.out' });
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      });
    }
  });
}

/* ==========================================================================
   HERO SECTION REVEAL & PARALLAX
   ========================================================================== */
function triggerHeroReveal() {
  const title = document.getElementById('hero-title');
  if (title) {
    const lines = title.querySelectorAll('.char-line');
    lines.forEach((line) => {
      const text = line.textContent.trim();
      line.innerHTML = text
        .split('')
        .map((char) => `<span class="char">${char}</span>`)
        .join('');
    });

    gsap.from('.hero-kicker', {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: 'power3.out',
    });

    gsap.from('#hero-title .char', {
      opacity: 0,
      y: 40,
      rotationX: -40,
      stagger: 0.04,
      duration: 0.9,
      ease: 'back.out(1.4)',
      delay: 0.1,
    });

    gsap.from('.hero-tagline', {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.4,
    });

    gsap.from('.scroll-indicator', {
      opacity: 0,
      duration: 1,
      delay: 0.6,
    });
  }
}

function initHeroAnimations() {
  gsap.to('.hero-video-wrapper', {
    scale: 1.15,
    y: 80,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    }
  });
}

/* ==========================================================================
   "OUR COFFEE" SECTION
   ========================================================================== */
function initCoffeeSection() {
  gsap.from('#coffee .text-col > *', {
    opacity: 0,
    y: 35,
    stagger: 0.15,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#coffee',
      start: 'top 75%',
    }
  });

  gsap.from('#coffee .stat-item', {
    opacity: 0,
    y: 20,
    stagger: 0.12,
    duration: 0.7,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.coffee-stats',
      start: 'top 85%',
    }
  });
}

/* ==========================================================================
   "OUR SWEETS" — IMAGE WITH SPECIAL GLAZE EFFECTS
   ========================================================================== */
function initSweetsSection() {
  const img = document.getElementById('sweets-macro-img');
  if (!img) return;

  gsap.to(img, {
    scale: 1.08,
    scrollTrigger: {
      trigger: '#sweets',
      start: 'top 80%',
      end: 'bottom 20%',
      scrub: 1,
    }
  });

  gsap.from('.sweet-card', {
    opacity: 0,
    x: 40,
    stagger: 0.2,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.sweets-cards-grid',
      start: 'top 80%',
    }
  });
}

/* ==========================================================================
   INGREDIENT / TEXTURE GALLERY (GSAP HORIZONTAL SCROLL)
   ========================================================================== */
function initGalleryHorizontalScroll() {
  const pinWrapper = document.getElementById('gallery');
  const track = document.getElementById('gallery-track');
  if (!pinWrapper || !track) return;

  function getScrollAmount() {
    return -(track.scrollWidth - window.innerWidth + 200);
  }

  gsap.to(track, {
    x: getScrollAmount,
    ease: 'none',
    scrollTrigger: {
      trigger: pinWrapper,
      start: 'top top',
      end: () => `+=${track.scrollWidth - window.innerWidth + 600}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
    }
  });
}

/* ==========================================================================
   NAVIGATION SCROLL STATE
   ========================================================================== */
function initNavScrollState() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  ScrollTrigger.create({
    start: 'top -50',
    end: 99999,
    toggleClass: { className: 'scrolled', targets: nav }
  });
}
