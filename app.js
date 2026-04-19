// App interactions + Tweaks panel
(function () {
  const T = window.TWEAKS || {};
  const root = document.documentElement;

  function applyTheme(name) {
    root.setAttribute('data-theme', name);
    document.querySelectorAll('.theme-sw').forEach(el => {
      el.classList.toggle('on', el.dataset.theme === name);
    });
    T.theme = name;
    // give three.js a tick to re-read CSS vars
    requestAnimationFrame(() => window.__refreshHero3DColors && window.__refreshHero3DColors());
  }
  function applyHero3D(name) {
    window.__setHero3D && window.__setHero3D(name);
    document.querySelectorAll('.h3d-sw').forEach(el => {
      el.classList.toggle('on', el.dataset.h3d === name);
    });
    T.hero3D = name;
  }
  function applyGrain(on) {
    document.body.dataset.grain = on ? 'on' : 'off';
    const cb = document.getElementById('tp-grain');
    if (cb) cb.checked = !!on;
    T.grain = !!on;
  }
  function applyRM(on) {
    document.documentElement.style.setProperty('--rm', on ? '1' : '0');
    const style = document.getElementById('rm-style') || (() => {
      const s = document.createElement('style');
      s.id = 'rm-style';
      document.head.appendChild(s);
      return s;
    })();
    style.textContent = on
      ? `*, *::before, *::after { animation-duration: 0.001ms !important; animation-delay: 0ms !important; transition-duration: 0.001ms !important; }`
      : '';
    const cb = document.getElementById('tp-rm');
    if (cb) cb.checked = !!on;
    T.reducedMotion = !!on;
  }

  // init from TWEAKS
  applyTheme(T.theme || 'indigo-amber');
  applyGrain(T.grain !== false);
  applyRM(!!T.reducedMotion);
  // hero3D handled after module script sets __setHero3D
  const tryH3D = () => {
    if (window.__setHero3D) applyHero3D(T.hero3D || 'orbit-rings');
    else setTimeout(tryH3D, 80);
  };
  tryH3D();

  // theme + h3d buttons
  document.querySelectorAll('.theme-sw').forEach(el => {
    el.addEventListener('click', () => {
      applyTheme(el.dataset.theme);
      persist({ theme: el.dataset.theme });
    });
  });
  document.querySelectorAll('.h3d-sw').forEach(el => {
    el.addEventListener('click', () => {
      applyHero3D(el.dataset.h3d);
      persist({ hero3D: el.dataset.h3d });
    });
  });
  const tpGrain = document.getElementById('tp-grain');
  const tpRM = document.getElementById('tp-rm');
  if (tpGrain) tpGrain.addEventListener('change', (e) => { applyGrain(e.target.checked); persist({ grain: e.target.checked }); });
  if (tpRM) tpRM.addEventListener('change', (e) => { applyRM(e.target.checked); persist({ reducedMotion: e.target.checked }); });

  function persist(edits) {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); } catch (e) {}
  }

  // tweaks edit-mode protocol
  const panel = document.getElementById('tweaks-panel');
  const closeBtn = document.getElementById('tp-close');
  function showPanel() { panel.hidden = false; }
  function hidePanel() { panel.hidden = true; }
  closeBtn && closeBtn.addEventListener('click', hidePanel);

  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === '__activate_edit_mode') showPanel();
    if (d.type === '__deactivate_edit_mode') hidePanel();
  });
  // announce
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  // reel play feedback
  const reelBtn = document.querySelector('[data-reel-play]');
  if (reelBtn) {
    reelBtn.addEventListener('click', () => {
      reelBtn.classList.add('playing');
      reelBtn.innerHTML = '<span style="width:10px;height:10px;background:currentColor;display:inline-block;border-radius:2px"></span><span>Reel coming soon</span>';
    });
  }

  // nav highlight on scroll
  const links = document.querySelectorAll('.nav-links a');
  const sections = Array.from(links).map(a => document.querySelector(a.getAttribute('href')));
  window.addEventListener('scroll', () => {
    const y = window.scrollY + 120;
    let idx = 0;
    sections.forEach((s, i) => { if (s && s.offsetTop <= y) idx = i; });
    links.forEach((l, i) => l.style.color = i === idx ? 'var(--c-primary)' : '');
  }, { passive: true });

  // smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
    });
  });

  // reveal sections on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) en.target.classList.add('in');
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.tl-item, .reel-card, .train-card, .social-card, .about-quote, .about-copy, .about-portrait').forEach(el => {
    el.classList.add('reveal');
    io.observe(el);
  });
})();
