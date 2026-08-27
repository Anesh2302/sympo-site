import { React, Suspense, useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";

import First from "./models/First";
import Second from "./models/Second";
import Third from "./models/Third";
import Fourth from "./models/Fourth";
import Fifth from "./models/Fifth";
import Sixth from "./models/Sixth";
import Seventh from "./models/Seventh";
import Eighth from "./models/Eighth";
import Ninth from "./models/Ninth";
import Tenth from "./models/Tenth";
import Eleventh from "./models/Eleventh";
import Bird from "./models/Bird";
import VideoBackdrop from "./components/VideoBackdrop";
import {
  cameraCurve,
  DebugCurve,
  CameraHelper,
  rotationTargets,
} from "./utils/curve";
import Fire from "./components/Fire";
import WaterFall from "./components/WaterFall";
import { useExperienceStore } from "../stores/experienceStore";

const LoadingManager = () => {
  const { active, progress } = useProgress();
  const { setIsExperienceLoading } = useExperienceStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExperienceLoading(active);
    }, 0);
    return () => clearTimeout(timer);
  }, [active, progress, setIsExperienceLoading]);

  return null;
};

const useChunkedLoading = () => {
  const [loadingStage, setLoadingStage] = useState(0);
  const { active } = useProgress();
  const prevActiveRef = useRef(true);
  const { incrementLoadedChunks } = useExperienceStore();

  useEffect(() => {
    if (prevActiveRef.current && !active) {
      const timer = setTimeout(() => {
        setLoadingStage((prev) => prev + 1);
        incrementLoadedChunks();
      }, 0);
      return () => clearTimeout(timer);
    }

    prevActiveRef.current = active;
  }, [active, incrementLoadedChunks]);

  return {
    shouldRenderChunk: (chunkIndex) => loadingStage >= chunkIndex,
  };
};

const Scene = ({
  cameraGroup,
  camera,
  scrollProgress,
  setscrollProgress,
  targetScrollProgress,
  lerpFactor,
  mousePositionOffset,
  mouseRotationOffset,
}) => {
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [rotationBufferQuat] = useState(
    new THREE.Quaternion().setFromEuler(rotationTargets[0].rotation)
  );
  const timeRef = useRef(0);

  // Cinematic intro flight after clicking Enter World.
  const introStartRef = useRef(null);
  const introDoneRef = useRef(false);
  const INTRO_DURATION = 3.2;
  // Dramatic exterior start point that sweeps down into the museum entry.
  const introStart = new THREE.Vector3(6.58, 22, 78);

  const easeInOutCubic = (x) =>
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  const { shouldRenderChunk } = useChunkedLoading();
  const isExperienceReady = useExperienceStore(
    (state) => state.isExperienceReady
  );

  const getLerpedRotation = (progress) => {
    for (let i = 0; i < rotationTargets.length - 1; i++) {
      const start = rotationTargets[i];
      const end = rotationTargets[i + 1];
      if (progress >= start.progress && progress <= end.progress) {
        const lerpFactor =
          (progress - start.progress) / (end.progress - start.progress);

        const startQuaternion = new THREE.Quaternion().setFromEuler(
          start.rotation
        );
        const endQuaternion = new THREE.Quaternion().setFromEuler(end.rotation);

        const lerpingQuaternion = new THREE.Quaternion();
        lerpingQuaternion.slerpQuaternions(
          startQuaternion,
          endQuaternion,
          lerpFactor
        );

        return lerpingQuaternion;
      }
    }

    return new THREE.Quaternion().setFromEuler(
      rotationTargets[rotationTargets.length - 1].rotation
    );
  };

  useFrame((state) => {
    if (camera) {
      // Pulsating Time
      timeRef.current = state.clock.getElapsedTime();
      const newPulseIntensity = (Math.sin(state.clock.elapsedTime * 3) + 1) / 2;
      setPulseIntensity(newPulseIntensity);

      // Cinematic intro: advance the timeline after Enter World
      let introT = 1;
      if (isExperienceReady && !introDoneRef.current) {
        if (introStartRef.current === null) {
          introStartRef.current = state.clock.elapsedTime;
        }
        introT = (state.clock.elapsedTime - introStartRef.current) / INTRO_DURATION;
        if (introT >= 1) {
          introT = 1;
          introDoneRef.current = true;
        }
      }
      const inIntro = introT < 1;

      // Lerp to new position
      let newProgress = THREE.MathUtils.lerp(
        scrollProgress,
        targetScrollProgress.current,
        lerpFactor
      );

      // During the intro, ignore user scroll so the cinematic plays cleanly.
      if (inIntro) {
        targetScrollProgress.current = 0;
        newProgress = 0;
      }

      // Clamp camera bounds at start and end
      if (newProgress > 1) {
        newProgress = 0;
        targetScrollProgress.current = 0;
      } else if (newProgress < 0) {
        newProgress = 0;
        targetScrollProgress.current = 0;
      }

      setscrollProgress(newProgress);

      // Lerp to new camera offset position
      const basePoint = cameraCurve.getPoint(inIntro ? 0 : newProgress);

      if (inIntro) {
        // Cinematic fly-in: sweep from the exterior down into the entry point.
        const e = easeInOutCubic(introT);
        cameraGroup.current.position.x = THREE.MathUtils.lerp(
          introStart.x,
          basePoint.x,
          e
        );
        cameraGroup.current.position.y = THREE.MathUtils.lerp(
          introStart.y,
          basePoint.y,
          e
        );
        cameraGroup.current.position.z = THREE.MathUtils.lerp(
          introStart.z,
          basePoint.z,
          e
        );
        // Keep the entry camera settled at the start of its own head-look.
        camera.current.position.x = 0;
        camera.current.position.y = 0;
        camera.current.position.z = 0;
      } else {
        cameraGroup.current.position.x = THREE.MathUtils.lerp(
          cameraGroup.current.position.x,
          basePoint.x,
          0.1
        );
        cameraGroup.current.position.y = THREE.MathUtils.lerp(
          cameraGroup.current.position.y,
          basePoint.y,
          0.1
        );
        cameraGroup.current.position.z = THREE.MathUtils.lerp(
          cameraGroup.current.position.z,
          basePoint.z,
          0.1
        );
      }

      camera.current.position.x = THREE.MathUtils.lerp(
        camera.current.position.x,
        mousePositionOffset.current.x,
        0.1
      );
      camera.current.position.y = THREE.MathUtils.lerp(
        camera.current.position.y,
        -mousePositionOffset.current.y,
        0.1
      );
      camera.current.position.z = 0;

      const targetRotation = getLerpedRotation(newProgress);

      // Use slerp to smoothly interpolate between our target rotations
      rotationBufferQuat.slerp(targetRotation, 0.05);

      cameraGroup.current.quaternion.copy(rotationBufferQuat);

      // Direct camera rotation, NOT the group
      camera.current.rotation.x = THREE.MathUtils.lerp(
        camera.current.rotation.x,
        -mouseRotationOffset.current.x,
        0.1
      );
      camera.current.rotation.y = THREE.MathUtils.lerp(
        camera.current.rotation.y,
        -mouseRotationOffset.current.y,
        0.1
      );
    }
  });

  return (
    <>
      <LoadingManager />

      <fogExp2 attach="fog" color="#2e2a26" density={0.004} />
      {/* <DebugCurve curve={cameraCurve} /> */}

      {/* Fullscreen landscape video backdrop: only loads after Enter World to avoid startup lag */}
      {isExperienceReady && <VideoBackdrop />}

      <Suspense fallback={null}>
        <First />
        <Second />
      </Suspense>

      {shouldRenderChunk(1) && (
        <Suspense fallback={null}>
          <Third />
          <Fourth />
          <Fifth />
        </Suspense>
      )}

      {shouldRenderChunk(2) && (
        <Suspense fallback={null}>
          <Sixth />
          <Seventh />
          <Eighth time={timeRef.current} />
        </Suspense>
      )}

      {shouldRenderChunk(3) && (
        <Suspense fallback={null}>
          <Ninth progress={scrollProgress} pulseIntensity={pulseIntensity} />
          <Tenth />
          <Eleventh />
          <Bird time={timeRef.current} position={[-20, 40, -45]} scale={0.02} />
          <Fire time={timeRef.current} />
          <WaterFall time={timeRef.current} />
        </Suspense>
      )}
    </>
  );
};

export default Scene;
