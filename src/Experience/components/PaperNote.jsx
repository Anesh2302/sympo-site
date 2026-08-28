/*
 * PaperNote - the original welcome parchment ("Codrops Museum") is baked into
 * the desk model's texture, so we cover the podium's top plate with a plane
 * carrying a canvas-drawn parchment (SRM VEC welcome text, Eagle Lake font).
 * The plate's position/size is measured at runtime from the decoded geometry.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const INK = "#43301c";
const INK_SOFT = "#5d4326";

/* Seeded pseudo-random so the aged blotches look identical on every redraw */
function makeRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function wrapText(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawParchment(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const rand = makeRand(7);

  /* ---- aged paper base ---- */
  ctx.fillStyle = "#efe0bc";
  ctx.fillRect(0, 0, W, H);

  // coffee-ish blotches
  for (let i = 0; i < 90; i++) {
    const r = (0.015 + rand() * 0.09) * W;
    ctx.fillStyle = `rgba(${150 + ((rand() * 40) | 0)}, ${110 + ((rand() * 40) | 0)}, ${60 + ((rand() * 30) | 0)}, ${0.04 + rand() * 0.05})`;
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // darkened edges vignette
  const g = ctx.createRadialGradient(
    cx,
    H / 2,
    Math.min(W, H) * 0.3,
    cx,
    H / 2,
    Math.max(W, H) * 0.72
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(96,64,28,0.4)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // double rule border
  ctx.strokeStyle = "#8a6537";
  ctx.lineWidth = Math.max(2, W * 0.0045);
  ctx.strokeRect(W * 0.035, H * 0.028, W * 0.93, H * 0.944);
  ctx.strokeStyle = "rgba(138,101,55,0.55)";
  ctx.lineWidth = Math.max(1, W * 0.002);
  ctx.strokeRect(W * 0.048, H * 0.038, W * 0.904, H * 0.924);

  /* ---- text ---- */
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Title
  ctx.font = `${W * 0.082}px "Eagle Lake", Georgia, serif`;
  ctx.fillText("Welcome to SRM VEC", cx, H * 0.135);

  // Ornamental divider
  ctx.fillStyle = INK_SOFT;
  ctx.font = `${W * 0.042}px "Eagle Lake", Georgia, serif`;
  ctx.fillText("\u2014\u2014  \u2756  \u2014\u2014", cx, H * 0.195);

  // Body paragraph
  ctx.fillStyle = INK;
  ctx.font = `italic ${W * 0.0365}px Georgia, "Times New Roman", serif`;
  const body =
    "On behalf of the Department of Cybersecurity, we extend a warm " +
    "welcome to everyone attending this symposium. We are delighted to " +
    "have you with us and would like to thank all the participants and " +
    "registrants for being part of this event.";
  const bodyLines = wrapText(ctx, body, W * 0.76);
  let y = H * 0.26;
  const lineH = W * 0.058;
  bodyLines.forEach((line) => {
    ctx.fillText(line, cx, y);
    y += lineH;
  });

  // Quote
  ctx.textAlign = "center";
  ctx.font = `${W * 0.045}px "Eagle Lake", Georgia, serif`;
  const quote = "\u201CEvery short path leads to a new life for Everyone\u201D";
  const quoteLines = wrapText(ctx, quote, W * 0.78);
  let qy = H * 0.72;
  quoteLines.forEach((line) => {
    ctx.fillText(line, cx, qy);
    qy += W * 0.058;
  });

  // Attribution
  ctx.font = `italic ${W * 0.036}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText("\u2014 Dept. of Cyber Security", cx + W * 0.08, qy + W * 0.035);

  // Footer
  ctx.fillStyle = INK_SOFT;
  ctx.font = `${W * 0.024}px "Eagle Lake", Georgia, serif`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${W * 0.004}px`;
  ctx.fillText(
    "\u25C6  ZYVERSE 2K26  \u00B7  NATIONAL LEVEL TECHNICAL SYMPOSIUM  \u25C6",
    cx,
    H * 0.925
  );
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

export default function PaperNote({ geometry, position }) {
  const { material, texture, canvas, width, depth, top, cx, cz } = useMemo(() => {
    // 1) Locate the podium's top plate from the decoded mesh geometry:
    //    the vertices in the top 4% of the mesh's height form its top surface.
    geometry?.computeBoundingBox?.();
    const bb = geometry?.boundingBox ?? new THREE.Box3();
    const cutoff = bb.max.y - (bb.max.y - bb.min.y) * 0.04;
    const posAttr = geometry?.attributes?.position;
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity,
      found = 0;
    if (posAttr) {
      for (let i = 0; i < posAttr.count; i++) {
        if (posAttr.getY(i) >= cutoff) {
          const x = posAttr.getX(i);
          const z = posAttr.getZ(i);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (z < minZ) minZ = z;
          if (z > maxZ) maxZ = z;
          found++;
        }
      }
    }
    if (!found) {
      minX = bb.min.x;
      maxX = bb.max.x;
      minZ = bb.min.z;
      maxZ = bb.max.z;
    }
    // sane caps in case a stray tall vertex stretches the cluster
    const width = THREE.MathUtils.clamp(maxX - minX, 0.4, 4);
    const depth = THREE.MathUtils.clamp(maxZ - minZ, 0.4, 4);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const top = bb.max.y;

    // 2) Canvas sized to the plate's real aspect ratio
    const W = 1024;
    const H = THREE.MathUtils.clamp(Math.round((W * depth) / width), 512, 2048);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    drawParchment(canvas);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const material = new THREE.MeshBasicMaterial({ map: texture });

    return { material, texture, canvas, width, depth, top, cx, cz };
  }, [geometry]);

  // Redraw once the decorative webfont has actually loaded
  useEffect(() => {
    let cancelled = false;
    const redraw = () => {
      if (cancelled) return;
      drawParchment(canvas);
      texture.needsUpdate = true;
    };
    if (document.fonts?.load) {
      document.fonts
        .load('64px "Eagle Lake"')
        .catch(() => {})
        .then(() => document.fonts.ready)
        .catch(() => {})
        .then(redraw);
    }
    return () => {
      cancelled = true;
    };
  }, [texture, canvas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [texture, material]);

  // A thin plane hovering just above the podium's top plate (like the
  // wall emblems: an overlay on top of the baked desk, hiding the old note)
  return (
    <group
      position={[position[0] + cx, position[1] + top + 0.015, position[2] + cz]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.02, depth * 1.02]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}