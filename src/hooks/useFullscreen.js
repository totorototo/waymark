import { useCallback, useEffect, useState } from "react";

// iPhone Safari has no element Fullscreen API, so fall back to a fixed overlay in CSS: the
// caller puts its `is-fullscreen` class on the element while `isFullscreen` is true.
const hasFullscreenApi =
  typeof document !== "undefined" &&
  Boolean(document.fullscreenEnabled ?? document.webkitFullscreenEnabled);

// [isFullscreen, toggle] for the element `targetRef` points at.
export default function useFullscreen(targetRef) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!hasFullscreenApi) return undefined;
    const onChange = () => {
      const active = document.fullscreenElement ?? document.webkitFullscreenElement;
      setIsFullscreen(active === targetRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [targetRef]);

  // The CSS fallback has no native Escape-to-exit or scroll lock: wire both by hand.
  useEffect(() => {
    if (hasFullscreenApi || !isFullscreen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [isFullscreen]);

  const toggle = useCallback(() => {
    if (!hasFullscreenApi) {
      setIsFullscreen((previous) => !previous);
      return;
    }
    if (document.fullscreenElement ?? document.webkitFullscreenElement) {
      (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
      return;
    }
    const target = targetRef.current;
    (target?.requestFullscreen ?? target?.webkitRequestFullscreen)?.call(target)?.catch(() => {});
  }, [targetRef]);

  return [isFullscreen, toggle];
}
