import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { FireElement } from "../../Experience/components/Fire";

/* ═══════════════════════════════════════════════════════════════
   "House of the Dragons" intro scene — rendered behind the Enter
   World screen (replaces the old Wukong background video).

   A dark Valyrian night: storm flashes, rising dragonfire embers,
   roaring braziers and the golden dragon-Z sigil hovering above
   the flames, with a slow cinematic camera dolly + mouse parallax.
   ═══════════════════════════════════════════════════════════════ */

/* Soft radial gradient texture generated at runtime (no asset needed) */
function makeRadialTexture(stops, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ── Camera: cinematic dolly-in + slow drift + mouse parallax ── */
function CameraRig() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const cam = state.camera;

    const targetX = Math.sin(t * 0.11) * 2.4 + mouse.current.x * 1.8;
    const targetY = 8.2 + Math.sin(t * 0.16) * 0.7 - mouse.current.y * 1.0;

    cam.position.x = THREE.MathUtils.damp(cam.position.x, targetX, 1.4, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, targetY, 1.4, delta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, 27, 0.55, delta);
    cam.lookAt(0, 7, 0);
  });

  return null;
}

/* ── Rising dragonfire embers (GPU point particles) ── */
const EMBER_VERTEX = `
  attribute float aSeed;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uHeight;
  uniform float uSize;

  varying float vLife;

  void main() {
    vec3 p = position;

    // Per-spark rise speed variance
    float cycle = 0.45 + aSeed * 0.85;
    float rise = mod(uTime * uSpeed * cycle, uHeight);
    p.y = -uHeight * 0.5 + rise;

    // Wind-blown swirl so sparks never rise in straight lines
    p.x += sin(uTime * (0.25 + aSeed * 0.8) + aSeed * 43.0) * (0.8 + aSeed);
    p.z += cos(uTime * (0.2 + aSeed * 0.6) + aSeed * 31.0) * (0.8 + aSeed);

    // 1.0 just after birth (hot) -> 0.0 at the top (burnt out)
    vLife = 1.0 - rise / uHeight;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.5 + aSeed) * (160.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const EMBER_FRAGMENT = `
  uniform vec3 uColorHot;
  uniform vec3 uColorCool;
  uniform float uOpacity;

  varying float vLife;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.05, d) * (0.25 + vLife * 0.75) * uOpacity;
    alpha *= smoothstep(0.0, 0.08, vLife); // fade out at the very top
    if (alpha < 0.01) discard;

    vec3 color = mix(uColorCool, uColorHot, vLife * vLife);
    gl_FragColor = vec4(color, alpha);
  }
`;

function Embers({
  count = 320,
  width = 70,
  height = 26,
  depth = 26,
  speed = 1.15,
  size = 2.6,
  center = [0, 10, 0],
  colorHot = "#ffdf9e",
  colorCool = "#ff3c00",
  opacity = 0.9,
}) {
  const materialRef = useRef();

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * width;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * depth;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return geo;
  }, [count, width, depth]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uHeight: { value: height },
      uSize: { value: size },
      uColorHot: { value: new THREE.Color(colorHot) },
      uColorCool: { value: new THREE.Color(colorCool) },
      uOpacity: { value: opacity },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points geometry={geometry} position={center} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={EMBER_VERTEX}
        fragmentShader={EMBER_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── The dragon-Z sigil, forged in gold, hovering above the flames ── */
const SIGIL_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SIGIL_FRAGMENT = `
  uniform sampler2D uMap;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uMap, vUv);

    // The source PNG is a black dragon-Z on transparency:
    // its alpha channel is the shape mask.
    float mask = tex.a;
    if (mask < 0.02) discard;

    // Metallic gold gradient (matches the site's title styling)
    vec3 top = vec3(0.93, 0.88, 0.77); // #ede0c4
    vec3 mid = vec3(0.60, 0.50, 0.33); // #9a8055
    vec3 bot = vec3(0.91, 0.80, 0.44); // #e8cc70
    vec3 gold = vUv.y > 0.5
      ? mix(mid, top, (vUv.y - 0.5) * 2.0)
      : mix(bot, mid, vUv.y * 2.0);

    gl_FragColor = vec4(gold * uIntensity, mask);
  }
`;

function DragonSigil() {
  const sigilTexture = useTexture("/media/dragon-z-transparent.png");
  const materialRef = useRef();
  const groupRef = useRef();
  const glowRef = useRef();

  const glowTexture = useMemo(
    () =>
      makeRadialTexture([
        [0, "rgba(255, 190, 100, 0.85)"],
        [0.35, "rgba(255, 105, 25, 0.38)"],
        [1, "rgba(120, 20, 0, 0)"],
      ]),
    []
  );

  const uniforms = useMemo(
    () => ({
      uMap: { value: null },
      uIntensity: { value: 1 },
    }),
    []
  );

  useEffect(() => {
    sigilTexture.colorSpace = THREE.SRGBColorSpace;
    sigilTexture.anisotropy = 8;
    if (materialRef.current) {
      materialRef.current.uniforms.uMap.value = sigilTexture;
    }
  }, [sigilTexture]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker =
      0.94 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 15.1) * 0.02;

    if (groupRef.current) {
      groupRef.current.position.y = 15 + Math.sin(t * 0.55) * 0.4;
      groupRef.current.rotation.y = Math.sin(t * 0.28) * 0.18;
    }
    if (glowRef.current) {
      const s = 24 + Math.sin(t * 1.6) * 1.6;
      glowRef.current.scale.set(s, s, 1);
      glowRef.current.material.opacity =
        (0.55 + Math.sin(t * 1.9) * 0.12) * flicker;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uIntensity.value = flicker + 0.25;
    }
  });

  return (
    <group ref={groupRef} position={[0, 15, 0]}>
      {/* Warm fire-glow halo behind the sigil */}
      <sprite ref={glowRef} scale={[24, 24, 1]} position={[0, 0, -4]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          fog={false}
        />
      </sprite>

      {/* Dragon-Z silhouette masked in animated gold */}
      <mesh>
        <planeGeometry args={[8, 8]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={SIGIL_VERTEX}
          fragmentShader={SIGIL_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ── Distant volcano glow on the horizon ── */
function BackdropGlow() {
  const materialRef = useRef();
  const texture = useMemo(
    () =>
      makeRadialTexture([
        [0, "rgba(140, 38, 10, 0.55)"],
        [0.45, "rgba(70, 16, 5, 0.3)"],
        [1, "rgba(0, 0, 0, 0)"],
      ]),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (materialRef.current) {
      materialRef.current.opacity = 0.75 + Math.sin(t * 0.45) * 0.18;
    }
  });

  return (
    <sprite position={[0, 10, -70]} scale={[210, 130, 1]}>
      <spriteMaterial
        ref={materialRef}
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </sprite>
  );
}

/* ── Warm light pool on the ground beneath the braziers ── */
function FloorGlow() {
  const texture = useMemo(
    () =>
      makeRadialTexture([
        [0, "rgba(255, 140, 50, 0.55)"],
        [0.5, "rgba(160, 50, 10, 0.22)"],
        [1, "rgba(0, 0, 0, 0)"],
      ]),
    []
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4]}>
      <planeGeometry args={[110, 60]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}

/* ── Braziers of dragonfire (reuses the museum's fire shader) ── */
function Flames() {
  return (
    <group>
      {/* Flanking braziers */}
      <FireElement scale={[2.8, 7, 2.8]} position={[-11.5, 3.5, 4]} />
      <FireElement scale={[2.8, 7, 2.8]} position={[11.5, 3.5, 4]} />
      {/* Small fire pit beneath the sigil */}
      <FireElement scale={[1.2, 2.4, 1.2]} position={[0, 1.2, 2]} />
    </group>
  );
}

/* Keeps any WebGL / scene failure from ever blocking the loading
   screen — if the 3D intro cannot start, it simply hides and the
   dark themed background remains behind the Enter World button. */
class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════════
   The intro Canvas — mounted inside the loading screen and
   unmounted automatically once the world is entered.
   ═══════════════════════════════════════════════════════════════ */
export default function IntroScene() {
  return (
    <SceneErrorBoundary>
      <Canvas
        className="loading-screen-canvas"
        dpr={[1, 2]}
        camera={{ position: [0, 11, 40], fov: 50, near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#070403"]} />
        <fogExp2 attach="fog" color="#0a0503" density={0.011} />

        <CameraRig />

        <Suspense fallback={null}>
          <BackdropGlow />
          <FloorGlow />

          {/* Near embers — bright, quick sparks around the braziers */}
          <Embers />

          {/* Far embers — large, dim, slow drifting cinders */}
          <Embers
            count={140}
            width={95}
            height={36}
            depth={44}
            speed={0.55}
            size={4.4}
            center={[0, 12, -16]}
            colorHot="#ff9a4a"
            colorCool="#7e1c00"
            opacity={0.5}
          />

          <Flames />
          <DragonSigil />
        </Suspense>
      </Canvas>
    </SceneErrorBoundary>
  );
}