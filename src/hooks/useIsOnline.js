import { useEffect, useState } from "react";

// Copied from Terminus. Tracks the browser's network status. Map tiles come from Mapbox at
// runtime, so the map swaps to an offline route preview when the connection drops.
export function useIsOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
