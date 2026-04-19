// Three.js hero 3D — orbit rings / ribbon / gem / particles
import * as THREE from 'three';

const canvas = document.getElementById('hero3d');
if (canvas) {
  const wrap = document.getElementById('hero3d-wrap');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(3, 5, 4);
  scene.add(dir);
  const fill = new THREE.PointLight(0x6e6eff, 1.4, 25);
  fill.position.set(-4, -2, 3);
  scene.add(fill);

  function getColors() {
    const cs = getComputedStyle(document.documentElement);
    const primary = new THREE.Color(cs.getPropertyValue('--c-primary').trim() || '#4F46E5');
    const accent = new THREE.Color(cs.getPropertyValue('--c-accent').trim() || '#F59E0B');
    return { primary, accent };
  }

  // root group that holds the active object
  const root = new THREE.Group();
  scene.add(root);
  let mode = null;
  let animators = [];

  function clear() {
    while (root.children.length) {
      const o = root.children[0];
      root.remove(o);
      o.traverse && o.traverse(n => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) {
          if (Array.isArray(n.material)) n.material.forEach(m => m.dispose());
          else n.material.dispose();
        }
      });
    }
    animators = [];
  }

  function buildOrbitRings() {
    clear();
    const { primary, accent } = getColors();
    const rings = 7;
    for (let i = 0; i < rings; i++) {
      const r = 1.1 + i * 0.28;
      const g = new THREE.TorusGeometry(r, 0.015 + i * 0.004, 24, 220);
      const isAccent = i % 3 === 0;
      const m = new THREE.MeshStandardMaterial({
        color: isAccent ? accent : primary,
        metalness: 0.35,
        roughness: 0.25,
        emissive: isAccent ? accent : primary,
        emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.rotation.z = Math.random() * Math.PI;
      const axis = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
      const speed = (0.12 + Math.random() * 0.25) * (i % 2 ? 1 : -1);
      animators.push((t, dt) => {
        mesh.rotateOnAxis(axis, dt * speed);
      });
      root.add(mesh);
    }
    // central orb
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 48, 48),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.3 })
    );
    root.add(orb);
    animators.push((t) => {
      orb.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    });
  }

  function buildRibbon() {
    clear();
    const { primary, accent } = getColors();
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(a) * (1.8 + Math.sin(a * 3) * 0.6),
          Math.sin(a * 2) * 1.2,
          Math.sin(a) * (1.5 + Math.cos(a * 3) * 0.4)
        );
      }),
      true, 'catmullrom', 0.5
    );
    const geom = new THREE.TubeGeometry(curve, 400, 0.06, 16, true);
    const mat = new THREE.MeshStandardMaterial({ color: primary, metalness: 0.4, roughness: 0.2, emissive: primary, emissiveIntensity: 0.12 });
    const mesh = new THREE.Mesh(geom, mat);
    root.add(mesh);
    // accent trails
    for (let k = 0; k < 30; k++) {
      const t = k / 30;
      const p = curve.getPointAt(t);
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.8 })
      );
      s.position.copy(p);
      root.add(s);
      animators.push((time) => {
        const tt = (t + time * 0.08) % 1;
        const pos = curve.getPointAt(tt);
        s.position.copy(pos);
      });
    }
    animators.push((t, dt) => {
      mesh.rotation.y += dt * 0.2;
      mesh.rotation.x += dt * 0.08;
    });
  }

  function buildIcosahedron() {
    clear();
    const { primary, accent } = getColors();
    const geo = new THREE.IcosahedronGeometry(1.8, 1);
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: primary, transparent: true, opacity: 0.6 })
    );
    const solid = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: primary, roughness: 0.25, metalness: 0.6, emissive: primary, emissiveIntensity: 0.08, flatShading: true
    }));
    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.5, roughness: 0.3, flatShading: true })
    );
    root.add(solid); root.add(wire); root.add(inner);
    animators.push((t, dt) => {
      solid.rotation.x += dt * 0.18;
      solid.rotation.y += dt * 0.22;
      wire.rotation.copy(solid.rotation);
      inner.rotation.x -= dt * 0.4;
      inner.rotation.z -= dt * 0.3;
    });
  }

  function buildParticles() {
    clear();
    const { primary, accent } = getColors();
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // swirl distribution
      const r = 0.3 + Math.random() * 2.6;
      const a = Math.random() * Math.PI * 2;
      const h = (Math.random() - 0.5) * 2.4;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = Math.sin(a) * r;
      const useAccent = Math.random() > 0.75;
      const c = useAccent ? accent : primary;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const m = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const points = new THREE.Points(g, m);
    root.add(points);
    animators.push((t, dt) => {
      points.rotation.y += dt * 0.18;
      const pos = g.attributes.position;
      for (let i = 0; i < count; i++) {
        const y = pos.array[i * 3 + 1];
        pos.array[i * 3 + 1] = y + Math.sin(t * 0.8 + i) * 0.0009;
      }
      pos.needsUpdate = true;
    });
  }

  function setMode(m) {
    mode = m;
    if (m === 'ribbon') buildRibbon();
    else if (m === 'icosahedron') buildIcosahedron();
    else if (m === 'particles') buildParticles();
    else buildOrbitRings();
  }

  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // pointer parallax
  let targetX = 0, targetY = 0;
  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetX = nx * 0.6;
    targetY = ny * 0.4;
  });

  let scrollY = 0;
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

  let last = performance.now() / 1000;
  function loop(now) {
    now /= 1000;
    const dt = Math.min(0.05, now - last);
    last = now;
    const t = now;
    // parallax
    root.rotation.y += (targetX - root.rotation.y) * 0.04;
    root.rotation.x += (targetY - root.rotation.x) * 0.04;
    // slight scroll translate + scale down as user scrolls away
    const s = Math.max(0.2, 1 - scrollY / 900);
    root.scale.setScalar(s);
    root.position.y = -scrollY * 0.002;

    for (const a of animators) a(t, dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // expose for tweaks
  window.__setHero3D = setMode;
  window.__refreshHero3DColors = () => {
    // simplest: rebuild
    setMode(mode);
  };

  // init
  setMode(window.TWEAKS?.hero3D || 'orbit-rings');
}
