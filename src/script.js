document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('rsvpForm');
  const submitBtn = document.getElementById('submitBtn');
  const successMessage = document.getElementById('successMessage');
  
  // Toggle +1 Fields
  const plusOneToggle = document.getElementById('plusone');
  const plusOneFields = document.getElementById('plusOneFields');
  const guestFname = document.getElementById('guest_fname');
  const guestLname = document.getElementById('guest_lname');
  const guestEmail = document.getElementById('guest_email');
  const guestCompany = document.getElementById('guest_company');

  if (plusOneToggle && plusOneFields) {
    const toggleFields = (show) => {
      if (show) {
        plusOneFields.classList.remove('hidden');
        if (guestFname) guestFname.required = true;
        if (guestLname) guestLname.required = true;
      } else {
        plusOneFields.classList.add('hidden');
        if (guestFname) { guestFname.required = false; guestFname.value = ''; }
        if (guestLname) { guestLname.required = false; guestLname.value = ''; }
        if (guestEmail) guestEmail.value = '';
        if (guestCompany) guestCompany.value = '';
      }
    };

    plusOneToggle.addEventListener('change', (e) => {
      toggleFields(e.target.checked);
    });

    // Handle initial state
    toggleFields(plusOneToggle.checked);
  }

  // Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'SUBMITTING...';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.plusone = formData.has('plusone');
    
    // Detect eventId from path
    const path = window.location.pathname;
    if (path.includes('/ronet')) {
      data.eventId = 'ronet';
    } else if (path.includes('/cigars')) {
      data.eventId = 'cigars';
    } else {
      data.eventId = 'cigars'; // default
    }

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        successMessage.classList.add('visible');
        form.style.display = 'none';
        form.reset();
        if (plusOneFields) plusOneFields.classList.add('hidden');
      } else {
        const err = await response.json();
        if (response.status === 409) {
          // Change success message content for duplicates
          successMessage.querySelector('h2').textContent = 'Already Confirmed';
          successMessage.querySelector('p').textContent = err.error;
          successMessage.classList.add('visible');
          form.style.display = 'none';
        } else {
          alert('Error: ' + (err.error || 'Failed to submit RSVP. Please try again.'));
        }
      }
    } catch (error) {
      alert('An error occurred. Please try again later.');
      console.error('Submission error:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'ACCEPT INVITATION';
    }
  });

  // Back & Share Logic
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      successMessage.classList.remove('visible');
      form.style.display = 'flex';
      
      // Reset success message to default for next potential use
      successMessage.querySelector('h2').textContent = 'Confirmed';
      successMessage.querySelector('p').textContent = 'Your RSVP has been received. You will receive a calendar invitation shortly.';
    });
  }

  const shareBtn = document.getElementById('shareBtn');
  const shareUrl = window.location.href;
  const pageTitle = document.title.split('|')[0].trim();
  const pageDesc = "Join me for an exclusive evening of networking and refined tastes.";
  const shareText = `${pageDesc} RSVP here:`;

  if (shareBtn) {
    shareBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: pageTitle,
            text: shareText,
            url: shareUrl
          });
        } catch (err) {
          if (err.name !== 'AbortError') console.error('Share failed:', err);
        }
      } else {
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          const originalText = shareBtn.innerHTML;
          shareBtn.textContent = 'LINK COPIED!';
          setTimeout(() => { shareBtn.innerHTML = originalText; }, 3000);
        } catch (err) {
          console.error('Could not copy text: ', err);
          alert('Link: ' + shareUrl);
        }
      }
    });
  }
  }
  
  // --- WEBGL SMOKE SHADER ---
  const canvas = document.getElementById('smoke-canvas');
  if (canvas && window.THREE) {
    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,          // not visible through CSS blur — saves fillrate
      powerPreference: 'high-performance'
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Handle Resize
    window.addEventListener('resize', () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });

    // Procedural 3D Simplex Noise GLSL
    const snoiseGLSL = `
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod289(i);
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }
    `;
    const isRonet = document.querySelector('.ronet-bg') !== null;

    // Shader Material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIsRonet: { value: isRonet ? 1.0 : 0.0 }
      },
      vertexShader: `
        ${snoiseGLSL}
        varying vec2 vUv;
        varying float vWidthPulse;
        uniform float uTime;
        uniform float uIsRonet;
        uniform float uCurve;
        uniform float uCurveSpeed;
        uniform float uCurveBias;
        uniform float uTwirlStrength;
        uniform float uNoiseSeed;
        uniform float uPointyTip;
        uniform float uMinCurve;

        vec2 rotate2D(vec2 value, float angle) {
          float s = sin(angle);
          float c = cos(angle);
          mat2 m = mat2(c, s, -s, c);
          return m * value;
        }

        void main() {
          vUv = uv;
          vec3 pos = position;
          float t = uv.y;

          vWidthPulse = snoise(vec3(uTime * 0.06 + uNoiseSeed, t * 1.5, uNoiseSeed * 2.1)) * 0.5 + 0.5;

          float spine1 = snoise(vec3(0.0, t * 0.6 + uTime * uCurveSpeed * 0.8, 0.1)) * uCurve;
          float spine2 = snoise(vec3(0.3, t * 1.4 + uTime * uCurveSpeed * 0.5, 0.7)) * uCurve * 0.6;
          float spine3 = snoise(vec3(0.7, t * 3.0 - uTime * 0.15, 1.2)) * uCurve * 0.2;
          
          float spineX = (spine1 + spine2 + spine3) * pow(t, 0.7);
          spineX += uCurveBias * t * t;

          float minDisp = uMinCurve * t * t;
          float spineDir = sign(spineX + 0.0001);
          spineX = spineDir * max(abs(spineX), minDisp);

          pos.x += spineX;

          float topSpread = snoise(vec3(uTime * 0.04, t * 0.8, 1.5 + uNoiseSeed * 3.7)) * 0.5 + 0.5;
          float taper = smoothstep(0.0, 0.7, t);
          float pinch = mix(1.0, smoothstep(1.0, 0.75, t), uPointyTip);
          pos.x *= (0.05 + (0.95 + topSpread * 1.0) * taper) * pinch;

          float baseTwist = snoise(vec3(0.0, t * 1.0 - uTime * 0.03, 0.0)) * 0.7;
          float topMask = pow(t, 4.0);
          float twistNoise = snoise(vec3(1.1, uTime * uCurveSpeed * 2.5, 0.4));
          float twistAmp   = snoise(vec3(2.3, uTime * uCurveSpeed * 1.2, 0.8)) * 0.5 + 0.5;
          float ampBlend   = clamp((uTwirlStrength - 1.0) / 1.5, 0.0, 1.0);
          float effectiveAmp = mix(twistAmp, 0.92, ampBlend);
          float topTwirl   = twistNoise * effectiveAmp * 6.4 * uTwirlStrength * topMask;

          pos.xz = rotate2D(pos.xz, baseTwist + topTwirl);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        ${snoiseGLSL}
        varying vec2 vUv;
        varying float vWidthPulse;
        uniform float uTime;
        uniform float uOpacityMult;
        uniform float uNoiseSeed;
        uniform float uIsRonet;

        void main() {
          float n1 = snoise(vec3(vUv.x * 3.0, vUv.y * 2.0 - uTime * 0.08, uTime * 0.04));
          float n2 = snoise(vec3(vUv.x * 6.0, vUv.y * 4.0 - uTime * 0.12, uTime * 0.06));
          n1 = n1 * 0.5 + 0.5;
          n2 = n2 * 0.5 + 0.5;
          float noiseVal = (n1 + n2 * 0.5) / 1.5;

          float core = smoothstep(0.35, 0.5, vUv.x) * smoothstep(0.65, 0.5, vUv.x);
          float smoke = core * smoothstep(0.3, 0.7, noiseVal);

          float topHalf = smoothstep(0.45, 0.75, vUv.y);
          float s = uNoiseSeed;
          float hole1 = snoise(vec3(vUv.x * 8.0,  vUv.y * 5.0  - uTime * 0.1,  uTime * 0.07 + 3.0 + s * 5.1));
          float hole2 = snoise(vec3(vUv.x * 18.0, vUv.y * 10.0 - uTime * 0.18, uTime * 0.09 + 7.0 + s * 3.7));
          float hole3 = snoise(vec3(vUv.x * 4.0,  vUv.y * 3.0  - uTime * 0.05, uTime * 0.04 + 12.0 + s * 7.3));
          
          hole1 = hole1 * 0.5 + 0.5;
          hole2 = hole2 * 0.5 + 0.5;
          hole3 = hole3 * 0.5 + 0.5;

          float disbursementStr = mix(0.6, 1.0, vWidthPulse);
          float disbursement = mix(1.0,
            smoothstep(0.3 * disbursementStr, 0.8, hole1)
            * smoothstep(0.2 * disbursementStr, 0.7, hole2)
            * smoothstep(0.25 * disbursementStr, 0.75, hole3),
            topHalf
          );
          smoke *= disbursement;

          float topTenth = smoothstep(0.90, 1.0, vUv.y);
          float topSpread = mix(1.0, 2.5, topTenth);
          float wideCore = smoothstep(0.5 - 0.5 * topSpread * 0.3, 0.5, vUv.x)
                         * smoothstep(0.5 + 0.5 * topSpread * 0.3, 0.5, vUv.x);
          smoke = mix(smoke, smoke * (0.4 + wideCore * 0.6), topTenth * 0.6);

          float fadeY = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
          smoke *= fadeY;

          vec3 finalColor;
          if (uIsRonet > 0.5) {
            vec3 blue   = vec3(0.0, 0.168, 0.498);
            vec3 yellow = vec3(0.988, 0.820, 0.086);
            vec3 red    = vec3(0.808, 0.067, 0.149);
            finalColor = mix(blue, yellow, smoothstep(0.42, 0.5, vUv.y));
            finalColor = mix(finalColor, red, smoothstep(0.5, 0.58, vUv.y));
          } else {
            finalColor = vec3(0.72, 0.80, 0.92);
          }

          gl_FragColor = vec4(finalColor, smoke * uOpacityMult * (uIsRonet > 0.5 ? 1.5 : 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const wisps = [];
    
    // Function to create a wisp
    function createWisp(width, height, offset, timeOffset, speed, opacityMult, curve, curveSpeed, curveBias = 0.0, twirlStrength = 1.0, noiseSeed = 0.0, pointyTip = 0.0, minCurve = 1.2) {
      const mat = material.clone();
      mat.uniforms = {
        uTime: { value: 0 },
        uIsRonet:       { value: isRonet ? 1.0 : 0.0 },
        uOpacityMult:   { value: opacityMult },
        uCurve:         { value: curve },
        uCurveSpeed:    { value: curveSpeed },
        uCurveBias:     { value: curveBias },
        uTwirlStrength: { value: twirlStrength },
        uNoiseSeed:     { value: noiseSeed },
        uPointyTip:     { value: pointyTip },
        uMinCurve:      { value: minCurve }
      };
      const geo = new THREE.PlaneGeometry(width, height, 32, 96);
      const mesh = new THREE.Mesh(geo, mat);
      
      if (isRonet) {
        // Horizontal Romanian Flag Smoke
        mesh.rotation.z = -Math.PI / 2;
        mesh.position.x = -2.0; 
        mesh.position.y = -2.0 + offset; 
      } else {
        // Vertical Cigar Smoke
        mesh.position.y = -0.8 + (height / 2.0);
        mesh.position.x = -0.3 + offset; 
      }
      mesh.position.z = -1;
      
      scene.add(mesh);
      wisps.push({ mat, timeOffset, speed });
    }

    if (isRonet) {
      createWisp(3.5, 18.0,  2.0,  0.0,  0.5, 0.75,  3.0, 0.06, 0.0, 1.0, 0.0, 0.0, 1.5);
      createWisp(3.0, 15.0,  4.5, 10.0,  0.6, 0.65,  4.0, 0.10, 0.0, 1.0, 1.0, 0.0, 1.8);
      createWisp(2.8, 16.0, -0.5, 25.0,  0.4, 0.70,  2.5, 0.08, 0.0, 1.0, 2.0, 0.0, 1.2);
      createWisp(4.5, 14.0,  2.5, 40.0,  0.35, 0.62,  2.0, 0.05, 4.5, 2.2, 3.0, 0.0, 2.0);
      createWisp(2.5, 15.0,  5.5, 55.0, 0.42, 0.68,  3.5, 0.14, 0.0, 1.8, 4.0, 1.0, 1.4);
    } else {
      createWisp(1.2, 12.0,  0.0,  0.0,  1.0, 0.18,  3.0, 0.06, 0.0, 1.0, 0.0, 0.0, 1.5);
      createWisp(1.8, 10.0, -0.1, 10.0,  1.2, 0.10,  4.0, 0.10, 0.0, 1.0, 1.0, 0.0, 1.8);
      createWisp(0.8, 15.0,  0.1, 25.0,  0.8, 0.15,  2.5, 0.08, 0.0, 1.0, 2.0, 0.0, 1.2);
      createWisp(2.2, 11.0,  0.0, 40.0,  0.7, 0.06,  2.0, 0.05, 4.5, 2.2, 3.0, 0.0, 2.0);
      createWisp(1.0, 11.0,  0.05, 55.0, 0.85, 0.14,  3.5, 0.14, 0.0, 1.8, 4.0, 1.0, 1.4);
    }

    // Animation loop — pauses when tab is hidden to save GPU
    const clock = new THREE.Clock();
    let animId = null;

    function animate() {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      for (let i = 0; i < wisps.length; i++) {
        wisps[i].mat.uniforms.uTime.value = t * wisps[i].speed + wisps[i].timeOffset;
      }
      renderer.render(scene, camera);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
        clock.stop();
      } else {
        clock.start();
        animate();
      }
    });

    animate();
  } else {
    console.error("Three.js failed to load or canvas not found.");
  }
});
