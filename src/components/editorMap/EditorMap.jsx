import "mapbox-gl/dist/mapbox-gl.css";

import { MapPin } from "@styled-icons/feather/MapPin";
import { Maximize2 } from "@styled-icons/feather/Maximize2";
import { Minimize2 } from "@styled-icons/feather/Minimize2";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map, Marker, Source } from "react-map-gl/mapbox";
import { useTheme } from "styled-components";

import useStore from "../../store/store.js";
import { clickRadius } from "../../utils/format.js";
import style from "./EditorMap.style.js";

const MAP_STYLE = "mapbox://styles/mapbox/outdoors-v12";
const TOKEN = import.meta.env.VITE_MAPBOX_KEY;
const PITCH = 55;

// iPhone Safari has no element Fullscreen API, so fall back to a fixed overlay in CSS.
const hasFullscreenApi =
  typeof document !== "undefined" &&
  Boolean(document.fullscreenEnabled ?? document.webkitFullscreenEnabled);

// geometry.points is flat [latitude, longitude, elevation, distance] per point.
export function routeFeature(points) {
  const coordinates = [];
  for (let i = 0; i + 3 < points.length; i += 4) {
    coordinates.push([points[i + 1], points[i]]);
  }
  return { type: "Feature", geometry: { type: "LineString", coordinates } };
}

export function routeBounds(points) {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (let i = 0; i + 3 < points.length; i += 4) {
    south = Math.min(south, points[i]);
    north = Math.max(north, points[i]);
    west = Math.min(west, points[i + 1]);
    east = Math.max(east, points[i + 1]);
  }
  return [
    [west, south],
    [east, north],
  ];
}

const LINE_LAYOUT = { "line-join": "round", "line-cap": "round" };

function useFullscreen(containerRef) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!hasFullscreenApi) return undefined;
    const onChange = () => {
      const active = document.fullscreenElement ?? document.webkitFullscreenElement;
      setIsFullscreen(active === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [containerRef]);

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
    const container = containerRef.current;
    (container?.requestFullscreen ?? container?.webkitRequestFullscreen)
      ?.call(container)
      ?.catch(() => {});
  }, [containerRef]);

  return [isFullscreen, toggle];
}

// `children` are overlays (the notice) kept inside the container so fullscreen shows them.
function EditorMap({ className, children }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const theme = useTheme();
  const geometry = useStore((state) => state.geometry);
  const pins = useStore((state) => state.pins);
  const selectedId = useStore((state) => state.selectedId);
  const pending = useStore((state) => state.pending);
  const mapClick = useStore((state) => state.mapClick);
  const selectPin = useStore((state) => state.selectPin);
  const addPin = useStore((state) => state.addPin);
  const [isFullscreen, toggleFullscreen] = useFullscreen(containerRef);

  const feature = useMemo(() => routeFeature(geometry.points), [geometry]);

  // fitBounds zooms out too far when the camera is pitched, so fit flat, then tilt in place.
  const fitRoute = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.fitBounds(routeBounds(geometry.points), { padding: 48, duration: 0 });
    map.easeTo({ pitch: PITCH, duration: 0 });
  }, [geometry]);

  useEffect(() => {
    fitRoute();
  }, [fitRoute]);

  // The `terrain` prop tries once, before <Source id="mapbox-dem"> exists, and never again:
  // set it when the DEM source arrives.
  const onLoad = useCallback(() => {
    fitRoute();
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const applyTerrain = () => {
      if (!map.getSource("mapbox-dem")) return;
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      map.off("sourcedata", applyTerrain);
    };
    applyTerrain();
    map.on("sourcedata", applyTerrain);
  }, [fitRoute]);

  // Fullscreen resizes the container without a window "resize": redraw the canvas.
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return undefined;
    const id = requestAnimationFrame(() => map.resize());
    return () => cancelAnimationFrame(id);
  }, [isFullscreen]);

  if (!TOKEN) {
    return (
      <div className={className}>
        <p className="missing" role="alert">
          Set VITE_MAPBOX_KEY (see .env.example) to show the map.
        </p>
        {children}
      </div>
    );
  }

  // Mapbox paint takes colours, not CSS custom properties: read them from the theme.
  const colors = theme.colors[theme.currentVariant];
  const linePaint = { "line-color": colors["--color-primary"], "line-width": 3 };

  const onClick = (event) => {
    mapClick({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
      radius_m: clickRadius(event.lngLat.lat, event.target.getZoom()),
    });
  };

  return (
    <div ref={containerRef} className={`${className}${isFullscreen ? " is-fullscreen" : ""}`}>
      <button
        type="button"
        className="fullscreen"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen map" : "View map fullscreen"}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{
          bounds: routeBounds(geometry.points),
          fitBoundsOptions: { padding: 48 },
          pitch: PITCH,
        }}
        maxPitch={70}
        onLoad={onLoad}
        onClick={onClick}
        cursor="crosshair"
      >
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        <Source id="route" type="geojson" data={feature}>
          <Layer id="route-line" type="line" layout={LINE_LAYOUT} paint={linePaint} />
        </Source>
        {pins.map((pin, index) => (
          <Marker key={pin.id} latitude={pin.latitude} longitude={pin.longitude} anchor="bottom">
            <button
              type="button"
              className={`pin ${pin.id === selectedId ? "selected" : ""}`}
              aria-label={`${pin.name || "Unnamed pin"}, pin ${index + 1}`}
              aria-pressed={pin.id === selectedId}
              title={pin.name || undefined}
              onClick={(event) => {
                event.stopPropagation();
                selectPin(pin.id);
              }}
            >
              <MapPin size={32} aria-hidden="true" />
              <span className="number">{index + 1}</span>
            </button>
          </Marker>
        ))}
        {pending?.candidates.map((candidate, index) => (
          <Marker
            key={`${candidate.distance_m}`}
            latitude={candidate.latitude}
            longitude={candidate.longitude}
            anchor="center"
          >
            <button
              type="button"
              className="candidate"
              aria-label={`Pin at km ${(candidate.distance_m / 1000).toFixed(1)}`}
              onClick={(event) => {
                event.stopPropagation();
                addPin(candidate);
              }}
            >
              {(candidate.distance_m / 1000).toFixed(1)}
              <span className="rank">#{index + 1}</span>
            </button>
          </Marker>
        ))}
      </Map>
      {children}
    </div>
  );
}

export default style(EditorMap);
