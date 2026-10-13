import "mapbox-gl/dist/mapbox-gl.css";

import { MapPin } from "@styled-icons/feather/MapPin";
import { Maximize2 } from "@styled-icons/feather/Maximize2";
import { Minimize2 } from "@styled-icons/feather/Minimize2";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Map, Marker, Source } from "react-map-gl/mapbox";

import useStore from "../../store/store.js";
import { clickRadius } from "../../utils/format.js";
import style, { MAP_COLORS } from "./EditorMap.style.js";

const MAP_STYLE = "mapbox://styles/mapbox/outdoors-v12";
const TOKEN = import.meta.env.VITE_MAPBOX_KEY;
// why flat by default: pins go on a thin line, and a click on a pitched map lands on a
// foreshortened, distorted route. 3D is a look at the terrain, one click away.
const PITCH_3D = 55;
const TEXT_FONT = ["DIN Pro Bold", "Arial Unicode MS Bold"];
// Room around the route when fitting it: a pin stands 36 px above its point.
const FIT_PADDING = { top: 64, bottom: 32, left: 48, right: 64 };
// The phone layout's breakpoint, as in App.style.js.
const PHONE = "(max-width: 52em)";

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

const KM_STEPS = [1, 2, 5, 10, 20, 50, 100];
const KM_MARKS_MAX = 12;

// A label every 1, 2, 5… km, as few as keep the count under KM_MARKS_MAX, each placed
// between the two track points around its distance. Not at 0: the Start is there.
export function kmMarks(points, distance_m) {
  const km = distance_m / 1000;
  const step = KM_STEPS.find((each) => km / each <= KM_MARKS_MAX) ?? KM_STEPS.at(-1);
  const features = [];
  let i = 4;
  for (let mark = step; mark * 1000 < distance_m; mark += step) {
    const target = mark * 1000;
    while (i + 3 < points.length && points[i + 3] < target) i += 4;
    if (i + 3 >= points.length) break;
    const [lat0, lon0, , d0] = points.slice(i - 4, i);
    const [lat1, lon1, , d1] = points.slice(i, i + 4);
    const t = d1 > d0 ? (target - d0) / (d1 - d0) : 0;
    features.push({
      type: "Feature",
      properties: { label: `${mark} km` },
      geometry: {
        type: "Point",
        coordinates: [lon0 + (lon1 - lon0) * t, lat0 + (lat1 - lat0) * t],
      },
    });
  }
  return { type: "FeatureCollection", features };
}

const LINE_LAYOUT = { "line-join": "round", "line-cap": "round" };
const CASING_PAINT = { "line-color": MAP_COLORS.casing, "line-width": 7 };
const LINE_PAINT = { "line-color": MAP_COLORS.route, "line-width": 4 };
// Chevrons along the line, pointing the way the race runs.
const ARROW_LAYOUT = {
  "symbol-placement": "line",
  "symbol-spacing": 90,
  "text-field": "›",
  "text-font": TEXT_FONT,
  "text-size": 22,
  "text-keep-upright": false,
  "text-allow-overlap": true,
};
const ARROW_PAINT = { "text-color": MAP_COLORS.casing };
const KM_LAYOUT = {
  "text-field": ["get", "label"],
  "text-font": TEXT_FONT,
  "text-size": 11,
  "text-offset": [0, -1.1],
};
const KM_PAINT = {
  "text-color": MAP_COLORS.label,
  "text-halo-color": MAP_COLORS.casing,
  "text-halo-width": 1.5,
};

// `children` are overlays (the notice) kept inside the map. Fullscreen is the workspace's
// (map and panel), toggled from here: `isFullscreen` and `onToggleFullscreen`.
function EditorMap({ className, children, isFullscreen, onToggleFullscreen }) {
  const mapRef = useRef(null);
  const geometry = useStore((state) => state.geometry);
  const pins = useStore((state) => state.pins);
  const selectedId = useStore((state) => state.selectedId);
  const pending = useStore((state) => state.pending);
  const mapClick = useStore((state) => state.mapClick);
  const selectPin = useStore((state) => state.selectPin);
  const addPin = useStore((state) => state.addPin);
  const movePin = useStore((state) => state.movePin);
  const [tilted, setTilted] = useState(false);
  // A Marker only moves when its props change: after a drop the store refused (off the
  // route), redraw so the pin goes back to where the store has it.
  const [, redraw] = useState(0);
  // On a phone the map sits in a page that scrolls: one finger scrolls the page, two move
  // the map (a tap still adds a pin, a pin still drags).
  // why cooperative gestures: without them the map, half the screen, swallowed every swipe.
  const [onPhone] = useState(() => window.matchMedia?.(PHONE).matches ?? false);

  const feature = useMemo(() => routeFeature(geometry.points), [geometry]);
  const marks = useMemo(() => kmMarks(geometry.points, geometry.distance_m), [geometry]);

  // fitBounds zooms out too far when the camera is pitched, so fit flat, then tilt in place.
  const fitRoute = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.fitBounds(routeBounds(geometry.points), { padding: FIT_PADDING, duration: 0 });
    map.easeTo({ pitch: map.getPitch() > 0 ? PITCH_3D : 0, duration: 0 });
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

  // Off in fullscreen, which has no page around the map to scroll. Mapbox builds the
  // two-finger hints when the map is made, so this only switches off what a phone started.
  useEffect(() => {
    if (!onPhone) return;
    mapRef.current?.getMap?.()?.setCooperativeGestures?.(!isFullscreen);
  }, [onPhone, isFullscreen]);

  const fullscreenButton = (
    <button
      type="button"
      className="control fullscreen"
      onClick={onToggleFullscreen}
      aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen map and pins"}
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen map and pins"}
    >
      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );

  if (!TOKEN) {
    return (
      <div className={className}>
        {fullscreenButton}
        <p className="missing" role="alert">
          Set VITE_MAPBOX_KEY (see .env.example) to show the map.
        </p>
        {children}
      </div>
    );
  }

  const toggleTilt = () => {
    const next = !tilted;
    setTilted(next);
    mapRef.current?.getMap?.().easeTo({ pitch: next ? PITCH_3D : 0, duration: 600 });
  };

  const onDragEnd = (id, event) => {
    const map = mapRef.current?.getMap?.();
    const { lat, lng } = event.lngLat;
    movePin(id, {
      latitude: lat,
      longitude: lng,
      radius_m: clickRadius(lat, map?.getZoom() ?? 12),
    }).finally(() => redraw((count) => count + 1));
  };

  const onClick = (event) => {
    mapClick({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
      radius_m: clickRadius(event.lngLat.lat, event.target.getZoom()),
    });
  };

  return (
    <div className={className}>
      <div className="controls">
        {fullscreenButton}
        <button
          type="button"
          className="control tilt"
          onClick={toggleTilt}
          aria-pressed={tilted}
          title={tilted ? "Flat map" : "3D terrain"}
        >
          3D
        </button>
      </div>
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{
          bounds: routeBounds(geometry.points),
          fitBoundsOptions: { padding: FIT_PADDING },
          pitch: 0,
        }}
        maxPitch={70}
        cooperativeGestures={onPhone}
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
          <Layer id="route-casing" type="line" layout={LINE_LAYOUT} paint={CASING_PAINT} />
          <Layer id="route-line" type="line" layout={LINE_LAYOUT} paint={LINE_PAINT} />
          <Layer id="route-arrows" type="symbol" layout={ARROW_LAYOUT} paint={ARROW_PAINT} />
        </Source>
        <Source id="km-marks" type="geojson" data={marks}>
          <Layer id="km-labels" type="symbol" layout={KM_LAYOUT} paint={KM_PAINT} />
        </Source>
        {pins.map((pin, index) => (
          <Marker
            key={pin.id}
            latitude={pin.latitude}
            longitude={pin.longitude}
            anchor="bottom"
            // Mapbox fades a marker it thinks terrain hides, even on a flat map: never a pin.
            occludedOpacity={1}
            draggable
            onDragStart={() => selectPin(pin.id)}
            onDragEnd={(event) => onDragEnd(pin.id, event)}
          >
            <button
              type="button"
              className={`pin ${pin.id === selectedId ? "selected" : ""}`}
              aria-label={`${pin.name || "Unnamed pin"}, pin ${index + 1}`}
              aria-pressed={pin.id === selectedId}
              title={`${pin.name || "Unnamed pin"}: drag along the route to move it`}
              onClick={(event) => {
                event.stopPropagation();
                selectPin(pin.id);
              }}
            >
              <MapPin size={36} aria-hidden="true" />
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
            occludedOpacity={1}
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
