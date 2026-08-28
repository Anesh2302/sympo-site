/*
 * PaperNote - redraws the baked welcome parchment (Ninth_Paper_Baked) with
 * Zyverse / SRM VEC welcome text. The original text is baked into the model's
 * KTX2 atlas, so instead we generate a parchment texture on a 2D canvas and
 * remap the mesh's UV sub-rect onto it.
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
  const { material, texture, canvas } = useMemo(() => {
    // 1) Find the UV sub-rect this mesh uses inside the shared baked atlas
    let uMin = 0,
      uMax = 1,
      vMin = 0,
      vMax = 1;
    const uv = geometry?.attributes?.uv;
    if (uv) {
      uMin = uMax = uv.getX(0);
      vMin = vMax = uv.getY(0);
      const scan = (i) => {
        const u = uv.getX(i);
        const v = uv.getY(i);
        if (u < uMin) uMin = u;
        if (u > uMax) uMax = u;
        if (v < vMin) vMin = v;
        if (v > vMax) vMax = v;
      };
      const index = geometry.index;
      if (index) {
        for (let i = 0; i < index.count; i++) scan(index.getX(i));
      } else {
        for (let i = 0; i < uv.count; i++) scan(i);
      }
      // small inset so we never bleed into neighbouring atlas art
      const padU = (uMax - uMin) * 0.015;
      const padV = (vMax - vMin) * 0.015;
      uMin += padU;
      uMax -= padU;
      vMin += padV;
      vMax -= padV;
      if (uMax - uMin <= 0.001 || vMax - vMin <= 0.001) {
        uMin = 0;
        uMax = 1;
        vMin = 0;
        vMax = 1;
      }
    }

    // 2) Size the canvas to the paper's real-world aspect ratio
    geometry?.computeBoundingBox?.();
    const size = new THREE.Vector3();
    geometry?.boundingBox?.getSize(size);
    const dims = [size.x, size.y, size.z]
      .filter((d) => d > 1e-4)
      .sort((a, b) => b - a);
    const aspect = THREE.MathUtils.clamp(
      dims.length >= 2 ? dims[0] / dims[1] : 0.75,
      0.55,
      0.95
    );
    const W = 1024;
    const H = THREE.MathUtils.clamp(Math.round(W / aspect), 640, 2048);

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    drawParchment(canvas);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false; // match glTF atlas UV convention
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    // remap the atlas sub-rect onto the full canvas
    texture.repeat.set(1 / (uMax - uMin), 1 / (vMax - vMin));
    texture.offset.set(-uMin * texture.repeat.x, -vMin * texture.repeat.y);

    const material = new THREE.MeshBasicMaterial({ map: texture });

    return { material, texture, canvas };
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
  }, [texture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [texture, material]);

    return <mesh geometry={geometry} position={position} material={material} />;
}