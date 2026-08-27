import React, { useState, useEffect, useRef } from "react";
import "./LoadingScreen.scss";
import { useExperienceStore } from "../../stores/experienceStore.js";

const LoadingScreen = () => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [hasCompletedAnimation, setHasCompletedAnimation] = useState(false); // New state
  const animationRef = useRef(null);

  const {
    setIsExperienceReady,
    isExperienceLoading,
    loadedChunks,
    totalChunks,
  } = useExperienceStore();

  const loadingProgress = Math.round((loadedChunks / totalChunks) * 100);

  // Smoothly animate the displayed progress number
  useEffect(() => {
    if (loadingProgress > displayedProgress || !hasCompletedAnimation) {
      const animate = () => {
        setDisplayedProgress((prev) => {
          const step = Math.ceil((loadingProgress - prev) * 0.1);
          const newValue = prev + step;

          if (newValue >= loadingProgress) {
            const finalValue = Math.min(loadingProgress, 100);
            if (finalValue === 100) {
              setHasCompletedAnimation(true);
            }
            return finalValue;
          }
          animationRef.current = requestAnimationFrame(animate);
          return newValue;
        });
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loadingProgress, hasCompletedAnimation]);

  const handleReveal = () => {
    setIsRevealed(true);
    setIsExperienceReady();
  };

  const handleAnimationFinished = () => {
    setIsAnimationFinished(true);
  };

  if (isAnimationFinished) {
    return null;
  }

  // Only show button if BOTH conditions are met:
  // 1. Loading is technically complete (loadedChunks >= totalChunks)
  // 2. The animation has visually reached 100%
  // Without visual jump to 100 it'd show the enter button when it's done loading.
  // I want it to go to 100 THEN show the enter button not jump to it when it's done.
  const showEnterButton =
    !isExperienceLoading &&
    loadedChunks >= totalChunks &&
    hasCompletedAnimation &&
    !isRevealed;

  return (
    <>
      <div className="loading-screen">
        <video
          className="loading-screen-bg-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/media/wukong-pin.jpg"
          aria-hidden="true"
        >
          <source src="/media/wukong-pin-1080.mp4" type="video/mp4" />
        </video>
        <div className="loading-screen-bg-tint" />
        <div
          className={`background-top-half ${isRevealed ? "revealed" : ""}`}
          onTransitionEnd={handleAnimationFinished}
        ></div>
        <div
          className={`background-bottom-half ${isRevealed ? "revealed" : ""}`}
        ></div>
        <div className="loading-screen-info-container">
          <div
            className={`instructions-container ${isRevealed ? "revealed" : ""}`}
          >
            Slowly Drag or Scroll to Navigate
          </div>

          {!isRevealed && (
            <button
              className={`loading-screen-button ${showEnterButton ? "ready" : "waiting"}`}
              onClick={handleReveal}
              disabled={!showEnterButton}
            >
              {showEnterButton ? "Enter World" : "Loading…"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default LoadingScreen;
