/**
 * three-scene.js — Interactive 3D Visuals & Physics for AuctionHub
 * Powered by Three.js (WebGL) + CSS 3D Transforms
 */

window.Auction3D = (function () {
  const hasThree = typeof THREE !== 'undefined';

  // ─── 1. Stadium Background ──────────────────────────────────────────────────
  function initStadiumBackground(canvasId) {
    if (!hasThree) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080a14, 0.0018);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 60);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ground Grid (Cricket Pitch Arena)
    const gridHelper = new THREE.GridHelper(200, 40, 0xf0b429, 0x1e293b);
    gridHelper.position.y = -5;
    scene.add(gridHelper);

    // Sweeping Stadium Floodlights
    const light1 = new THREE.SpotLight(0x38bdf8, 5, 200, Math.PI / 5, 0.4, 1);
    light1.position.set(-60, 50, -20);
    scene.add(light1);

    const light2 = new THREE.SpotLight(0xf0b429, 6, 200, Math.PI / 5, 0.4, 1);
    light2.position.set(60, 50, -20);
    scene.add(light2);

    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
    scene.add(ambientLight);

    // Floating Golden Embers / Dust
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      speeds.push({
        y: 0.05 + Math.random() * 0.08,
        x: (Math.random() - 0.5) * 0.03,
        rot: (Math.random() - 0.5) * 0.02
      });
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMaterial = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 1.5,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(geometry, pMaterial);
    scene.add(particles);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    let clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Oscillate spotlights like real stadium searchlights
      light1.position.x = -60 + Math.sin(elapsed * 0.8) * 15;
      light1.position.z = -20 + Math.cos(elapsed * 0.6) * 15;

      light2.position.x = 60 + Math.cos(elapsed * 0.7) * 15;
      light2.position.z = -20 + Math.sin(elapsed * 0.9) * 15;

      // Animate floating particles
      const pos = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] += speeds[i].y;
        pos[i * 3]     += speeds[i].x;
        if (pos[i * 3 + 1] > 60) {
          pos[i * 3 + 1] = 0;
          pos[i * 3]     = (Math.random() - 0.5) * 120;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Smooth camera parallax
      camera.position.x += (mouseX * 8 - camera.position.x) * 0.04;
      camera.position.y += (15 - mouseY * 5 - camera.position.y) * 0.04;
      camera.lookAt(0, 5, 0);

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ─── 2. Interactive 3D Trophy Model ─────────────────────────────────────────
  function initTrophyScene(containerId) {
    if (!hasThree) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3, 16);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Trophy Group
    const trophyGroup = new THREE.Group();

    // Materials
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.92,
      roughness: 0.15,
      wireframe: false
    });

    const darkGoldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.95,
      roughness: 0.25
    });

    const marbleBaseMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.3,
      roughness: 0.3
    });

    // 1. Base pedestal (Octagonal stepped platform)
    const baseBottom = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 1, 8), marbleBaseMaterial);
    baseBottom.position.y = -4.5;
    trophyGroup.add(baseBottom);

    const baseTop = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, 0.8, 8), darkGoldMaterial);
    baseTop.position.y = -3.7;
    trophyGroup.add(baseTop);

    // 2. Trophy stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.8, 2.5, 16), goldMaterial);
    stem.position.y = -2.2;
    trophyGroup.add(stem);

    // 3. Central Trophy Chalice Cup
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 1.2, 4.2, 24, 1, true), goldMaterial);
    cup.position.y = 0.8;
    trophyGroup.add(cup);

    const cupBottom = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 16), goldMaterial);
    cupBottom.position.y = -1.0;
    trophyGroup.add(cupBottom);

    // 4. Curved Trophy Handles
    const handleGeom = new THREE.TorusGeometry(2.2, 0.28, 16, 32, Math.PI);
    const handleLeft = new THREE.Mesh(handleGeom, goldMaterial);
    handleLeft.position.set(-2.8, 1.0, 0);
    handleLeft.rotation.z = Math.PI * 0.5;
    trophyGroup.add(handleLeft);

    const handleRight = new THREE.Mesh(handleGeom, goldMaterial);
    handleRight.position.set(2.8, 1.0, 0);
    handleRight.rotation.z = -Math.PI * 0.5;
    trophyGroup.add(handleRight);

    // 5. Crown Golden Cricket Ball inside Cup
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 24), darkGoldMaterial);
    ball.position.y = 2.4;
    trophyGroup.add(ball);

    // Ball Seam Ring
    const seam = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.06, 12, 32), goldMaterial);
    seam.position.y = 2.4;
    seam.rotation.x = Math.PI / 4;
    trophyGroup.add(seam);

    scene.add(trophyGroup);

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(10, 15, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    const goldPoint = new THREE.PointLight(0xf59e0b, 3, 20);
    goldPoint.position.set(0, 5, 6);
    scene.add(goldPoint);

    // Hover Interaction
    let targetRotationY = 0;
    let targetRotationX = 0;
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetRotationY = x * 0.8;
      targetRotationX = y * 0.4;
    });
    container.addEventListener('mouseleave', () => {
      targetRotationX = 0;
    });

    function animateTrophy() {
      requestAnimationFrame(animateTrophy);
      trophyGroup.rotation.y += 0.008 + (targetRotationY - trophyGroup.rotation.y) * 0.05;
      trophyGroup.rotation.x += (targetRotationX - trophyGroup.rotation.x) * 0.05;

      // Slight floating motion
      trophyGroup.position.y = Math.sin(Date.now() * 0.002) * 0.25;

      renderer.render(scene, camera);
    }
    animateTrophy();

    window.addEventListener('resize', () => {
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  // ─── 3. Auction Arena 3D Podium & Animated Gavel ─────────────────────────────
  let arenaScene, arenaCamera, arenaRenderer;
  let podiumGroup, gavelGroup, shockwaveMesh, podiumLight;
  let confettiParticles = [];

  function initPlayerPodium(containerId) {
    if (!hasThree) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 260;

    arenaScene = new THREE.Scene();
    arenaCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    arenaCamera.position.set(0, 6, 14);
    arenaCamera.lookAt(0, 0.5, 0);

    arenaRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    arenaRenderer.setSize(width, height);
    arenaRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(arenaRenderer.domElement);

    podiumGroup = new THREE.Group();

    // 1. Hexagonal Hologram Pedestal
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.2
    });
    const glowRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      metalness: 0.5
    });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.0, 0.8, 6), baseMat);
    pedestal.position.y = -1.5;
    podiumGroup.add(pedestal);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.12, 16, 48), glowRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.1;
    podiumGroup.add(ring);

    // Orbiting light particles around podium
    const orbRingGeom = new THREE.BufferGeometry();
    const orbCount = 40;
    const orbPos = new Float32Array(orbCount * 3);
    for (let i = 0; i < orbCount; i++) {
      const angle = (i / orbCount) * Math.PI * 2;
      orbPos[i * 3]     = Math.cos(angle) * 4.2;
      orbPos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      orbPos[i * 3 + 2] = Math.sin(angle) * 4.2;
    }
    orbRingGeom.setAttribute('position', new THREE.BufferAttribute(orbPos, 3));
    const orbMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.25,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const orbPoints = new THREE.Points(orbRingGeom, orbMat);
    podiumGroup.add(orbPoints);

    // 2. Marble Sound Block (Striking Base for Gavel)
    const strikeBlock = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 })
    );
    strikeBlock.position.set(3.8, -1.3, 1.5);
    podiumGroup.add(strikeBlock);

    // 3. 3D Auctioneer's Gavel (Hammer)
    gavelGroup = new THREE.Group();

    const gavelMat = new THREE.MeshStandardMaterial({
      color: 0x92400e, // Rich dark wood
      metalness: 0.4,
      roughness: 0.3
    });
    const gavelGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2
    });

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 12), gavelMat);
    handle.position.set(0, 1.0, 0);
    gavelGroup.add(handle);

    // Hammer Head
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16), gavelMat);
    head.rotation.z = Math.PI / 2;
    head.position.set(0, 2.1, 0);
    gavelGroup.add(head);

    // Gold decorative bands on head
    const bandLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.15, 16), gavelGoldMat);
    bandLeft.rotation.z = Math.PI / 2;
    bandLeft.position.set(-0.4, 2.1, 0);
    gavelGroup.add(bandLeft);

    const bandRight = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.15, 16), gavelGoldMat);
    bandRight.rotation.z = Math.PI / 2;
    bandRight.position.set(0.4, 2.1, 0);
    gavelGroup.add(bandRight);

    gavelGroup.position.set(3.8, -1.0, 1.5);
    gavelGroup.rotation.z = -0.3;
    gavelGroup.rotation.x = 0.2;
    podiumGroup.add(gavelGroup);

    // 4. Shockwave ring mesh (Hidden until strike)
    const shockGeom = new THREE.RingGeometry(0.1, 0.3, 32);
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    shockwaveMesh = new THREE.Mesh(shockGeom, shockMat);
    shockwaveMesh.rotation.x = -Math.PI / 2;
    shockwaveMesh.position.set(3.8, -1.05, 1.5);
    podiumGroup.add(shockwaveMesh);

    arenaScene.add(podiumGroup);

    // Lighting
    podiumLight = new THREE.SpotLight(0xf59e0b, 4, 20, Math.PI / 4, 0.3);
    podiumLight.position.set(0, 10, 5);
    arenaScene.add(podiumLight);

    const ambient = new THREE.AmbientLight(0x0f172a, 1.8);
    arenaScene.add(ambient);

    const blueRim = new THREE.PointLight(0x38bdf8, 2, 15);
    blueRim.position.set(-6, 3, -4);
    arenaScene.add(blueRim);

    // Animation loop
    function animateArena() {
      requestAnimationFrame(animateArena);

      // Slow majestic rotation of podium
      pedestal.rotation.y += 0.005;
      orbPoints.rotation.y -= 0.01;

      // Update active confetti particles
      for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        p.position.add(p.velocity);
        p.velocity.y -= 0.008; // Gravity
        p.rotation.x += p.rotSpeed.x;
        p.rotation.y += p.rotSpeed.y;
        p.material.opacity -= 0.008;

        if (p.material.opacity <= 0 || p.position.y < -3) {
          arenaScene.remove(p);
          confettiParticles.splice(i, 1);
        }
      }

      arenaRenderer.render(arenaScene, arenaCamera);
    }
    animateArena();

    window.addEventListener('resize', () => {
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 260;
      arenaCamera.aspect = w / h;
      arenaCamera.updateProjectionMatrix();
      arenaRenderer.setSize(w, h);
    });
  }

  // ─── Trigger Gavel Strike Animation ──────────────────────────────────────────
  function triggerGavelStrike() {
    if (!gavelGroup) return;

    if (window.soundFX) {
      window.soundFX.gavelStrike();
    }

    const startRotZ = -0.3;
    const strikeRotZ = -1.35;
    const duration = 160;
    const startTime = performance.now();

    function stepStrike(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.6) {
        // Strike down
        const p = progress / 0.6;
        gavelGroup.rotation.z = startRotZ + (strikeRotZ - startRotZ) * (p * p);
      } else {
        // Rebound
        const p = (progress - 0.6) / 0.4;
        gavelGroup.rotation.z = strikeRotZ + (startRotZ - strikeRotZ) * (1 - Math.cos(p * Math.PI * 0.5));
      }

      if (progress < 1) {
        requestAnimationFrame(stepStrike);
      } else {
        gavelGroup.rotation.z = startRotZ;
      }
    }
    requestAnimationFrame(stepStrike);

    // Shockwave pulse
    if (shockwaveMesh) {
      shockwaveMesh.scale.set(1, 1, 1);
      shockwaveMesh.material.opacity = 1.0;

      const shockStart = performance.now();
      function stepShock(now) {
        const sElapsed = now - shockStart;
        const sProgress = Math.min(sElapsed / 350, 1);

        const s = 1 + sProgress * 8;
        shockwaveMesh.scale.set(s, s, 1);
        shockwaveMesh.material.opacity = (1 - sProgress) * 0.9;

        if (sProgress < 1) {
          requestAnimationFrame(stepShock);
        } else {
          shockwaveMesh.material.opacity = 0;
        }
      }
      setTimeout(() => requestAnimationFrame(stepShock), 80);
    }
  }

  // ─── Trigger Confetti & Gold Coin Burst ───────────────────────────────────────
  function triggerConfettiExplosion() {
    if (!arenaScene) return;

    if (window.soundFX) {
      window.soundFX.soldFanfare();
    }

    triggerGavelStrike();

    const colors = [0xf59e0b, 0xffd700, 0x38bdf8, 0x22c55e, 0xec4899, 0xa855f7];
    const count = 90;

    for (let i = 0; i < count; i++) {
      // 50% discs (coins), 50% cubes (confetti)
      let geom = (i % 2 === 0)
        ? new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12)
        : new THREE.BoxGeometry(0.22, 0.22, 0.05);

      const color = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 1
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 2,
        -1.0 + Math.random() * 0.5,
        (Math.random() - 0.5) * 2
      );

      mesh.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        0.25 + Math.random() * 0.35,
        (Math.random() - 0.5) * 0.35
      );

      mesh.rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );

      arenaScene.add(mesh);
      confettiParticles.push(mesh);
    }
  }

  // ─── Dynamic Role Color Updater ─────────────────────────────────────────────
  function updatePodiumColor(role) {
    if (!podiumLight) return;
    const r = String(role || '').toLowerCase();
    let col = 0xf59e0b; // Gold default

    if (r.includes('bat')) col = 0x38bdf8; // Cyan/Blue
    else if (r.includes('all')) col = 0xf59e0b; // Gold
    else if (r.includes('wick')) col = 0xa855f7; // Purple
    else if (r.includes('pace') || r.includes('bowl')) col = 0x22c55e; // Green
    else if (r.includes('spin')) col = 0xef4444; // Red

    podiumLight.color.setHex(col);
  }

  // ─── 4. CSS 3D Card Tilt Physics ────────────────────────────────────────────
  function apply3DTilt(selector, maxTilt = 12) {
    const cards = document.querySelectorAll(selector);
    cards.forEach(card => {
      card.style.transformStyle = 'preserve-3d';
      card.style.transition = 'transform 0.15s ease-out, box-shadow 0.2s ease-out';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  }

  return {
    initStadiumBackground,
    initTrophyScene,
    initPlayerPodium,
    triggerGavelStrike,
    triggerConfettiExplosion,
    updatePodiumColor,
    apply3DTilt
  };
})();
