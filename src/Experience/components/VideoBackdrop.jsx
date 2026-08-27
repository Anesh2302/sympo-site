import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Fullscreen landscape video backdrop.
 *
 * Renders the landscape video (`wukong-enter-bg-1080.mp4`, 1920x1080) on a large
 * flat plane placed behind the whole museum along the camera's view axis. The
 * plane is sized to cover any monitor aspect ratio, so the landscape fills the
 * screen centered behind the 3D world — matching the original flat-backdrop
 * look of the removed Background.glb.
 *
 * It is lightweight (1080p) and only mounted after the experience is entered,
 * so it doesn't slow down the initial page load.
 */
export default function VideoBackdrop({
  src = "/media/wukong-enter-bg-1080.mp4",
  position = [0, 20, -420],
  rotationY = Math.PI,
  width = 1600,
  height = 900,
  ...props
}) {
  const materialRef = useRef();
  const videoRef = useRef(null);
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.src = src;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    videoRef.current = video;

    const play = () => {
      const p = video.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    };

    video.addEventListener("loadeddata", play);
    video.addEventListener("canplay", play);

    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    setTexture(t);

    play();
    const retry = setInterval(play, 500);
    const cleanup = setTimeout(play, 1200);

    return () => {
      clearInterval(retry);
      clearTimeout(cleanup);
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.removeEventListener("loadeddata", play);
      video.removeEventListener("canplay", play);
      t.dispose();
      setTexture(null);
      videoRef.current = null;
    };
  }, [src]);

  useFrame(() => {
    if (texture && materialRef.current) {
      texture.needsUpdate = true;
    }
  });

  return (
    <mesh position={position} rotation-y={rotationY} {...props}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        ref={materialRef}
        side={THREE.DoubleSide}
        map={texture}
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}
