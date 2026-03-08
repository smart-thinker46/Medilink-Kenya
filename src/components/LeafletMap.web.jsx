import React, { useEffect, useMemo } from "react";
import { View } from "react-native";

const DEFAULT_CENTER = { latitude: -1.2921, longitude: 36.8219 };
const TILE_LAYERS = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    subdomains: [],
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    maxZoom: 17,
    subdomains: ["a", "b", "c"],
  },
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCoordinate = (item) => {
  if (!item) return null;
  const latitude = toNumber(item.latitude, NaN);
  const longitude = toNumber(item.longitude, NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const sanitizeMarkers = (markers = []) =>
  markers
    .map((marker, index) => {
      const coordinate = normalizeCoordinate(marker);
      if (!coordinate) return null;
      return {
        id: String(marker?.id || `${coordinate.latitude}-${coordinate.longitude}-${index}`),
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        title: String(marker?.title || ""),
        description: String(marker?.description || ""),
        color: String(marker?.color || "#1D4ED8"),
        label: String(marker?.label || ""),
      };
    })
    .filter(Boolean);

const sanitizePolylines = (polylines = []) =>
  polylines
    .map((line, index) => {
      const coordinates = (Array.isArray(line?.coordinates) ? line.coordinates : [])
        .map(normalizeCoordinate)
        .filter(Boolean);
      if (coordinates.length < 2) return null;
      return {
        id: String(line?.id || `line-${index}`),
        color: String(line?.color || "#1D4ED8"),
        width: toNumber(line?.width, 3),
        coordinates,
      };
    })
    .filter(Boolean);

const escapeForScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

export default function LeafletMap({
  style,
  center,
  zoom = 14,
  markers = [],
  polylines = [],
  mapType = "standard",
  onPress,
  onMarkerPress,
  interactive = true,
}) {
  const safeCenter = useMemo(() => normalizeCoordinate(center) || DEFAULT_CENTER, [center]);
  const safeMarkers = useMemo(() => sanitizeMarkers(markers), [markers]);
  const safePolylines = useMemo(() => sanitizePolylines(polylines), [polylines]);
  const safeMapType = useMemo(
    () => (Object.prototype.hasOwnProperty.call(TILE_LAYERS, mapType) ? mapType : "standard"),
    [mapType],
  );
  const mapId = useMemo(() => `leaflet-${Math.random().toString(36).slice(2, 10)}`, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (event) => {
      const payload = event?.data;
      if (!payload || payload.mapId !== mapId) return;
      if (payload.type === "leaflet-marker-press" && typeof onMarkerPress === "function") {
        onMarkerPress({
          markerId: String(payload.markerId || ""),
          latitude: toNumber(payload.latitude, NaN),
          longitude: toNumber(payload.longitude, NaN),
        });
        return;
      }
      if (payload.type === "leaflet-map-press" && typeof onPress === "function") {
        onPress({
          latitude: toNumber(payload.latitude, NaN),
          longitude: toNumber(payload.longitude, NaN),
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [mapId, onMarkerPress, onPress]);

  const html = useMemo(() => {
    const tileLayer = TILE_LAYERS[safeMapType] || TILE_LAYERS.standard;
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            crossorigin=""
          />
          <style>
            html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
            body { background: #E5E7EB; }
            .marker-label { font-size: 14px; font-weight: 700; color: #111827; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
          <script>
            (function() {
              const center = ${escapeForScript([safeCenter.latitude, safeCenter.longitude])};
              const markers = ${escapeForScript(safeMarkers)};
              const polylines = ${escapeForScript(safePolylines)};
              const mapId = ${escapeForScript(mapId)};
              const tileLayer = ${escapeForScript(tileLayer)};
              const interactive = ${interactive ? "true" : "false"};
              const zoom = ${Math.max(3, Math.min(19, toNumber(zoom, 14)))};

              const map = L.map("map", {
                zoomControl: interactive,
                dragging: interactive,
                scrollWheelZoom: interactive,
                doubleClickZoom: interactive,
                touchZoom: interactive,
                boxZoom: interactive,
                keyboard: interactive,
                attributionControl: false,
              }).setView(center, zoom);

              L.tileLayer(tileLayer.url, {
                maxZoom: Number.isFinite(tileLayer.maxZoom) ? tileLayer.maxZoom : 19,
                subdomains: Array.isArray(tileLayer.subdomains) ? tileLayer.subdomains : undefined,
              }).addTo(map);

              const escapeHtml = (value) =>
                String(value || "")
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");

              const bounds = [];
              polylines.forEach((line) => {
                const latLngs = line.coordinates.map((point) => [point.latitude, point.longitude]);
                if (!latLngs.length) return;
                const polyline = L.polyline(latLngs, {
                  color: line.color || "#1D4ED8",
                  weight: Number.isFinite(line.width) ? line.width : 3,
                }).addTo(map);
                polyline.getLatLngs().forEach((point) => bounds.push([point.lat, point.lng]));
              });

              markers.forEach((marker) => {
                const latLng = [marker.latitude, marker.longitude];
                const markerDot = L.circleMarker(latLng, {
                  radius: 7,
                  color: marker.color || "#1D4ED8",
                  fillColor: marker.color || "#1D4ED8",
                  fillOpacity: 0.9,
                  weight: 2,
                }).addTo(map);

                if (marker.title || marker.description) {
                  markerDot.bindPopup(
                    "<strong>" + escapeHtml(marker.title || "Location") + "</strong>" +
                      (marker.description ? "<br/>" + escapeHtml(marker.description) : "")
                  );
                }
                markerDot.on("click", function(event) {
                  L.DomEvent.stopPropagation(event);
                  window.parent.postMessage(
                    {
                      type: "leaflet-marker-press",
                      mapId: mapId,
                      markerId: marker.id,
                      latitude: marker.latitude,
                      longitude: marker.longitude,
                    },
                    "*"
                  );
                });

                if (marker.label) {
                  L.marker(latLng, {
                    interactive: false,
                    icon: L.divIcon({
                      className: "marker-label",
                      html: marker.label,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8],
                    }),
                  }).addTo(map);
                }

                bounds.push(latLng);
              });

              if (bounds.length > 1) {
                map.fitBounds(bounds, { padding: [24, 24] });
              }

              map.on("click", function (event) {
                window.parent.postMessage(
                  {
                    type: "leaflet-map-press",
                    mapId: mapId,
                    latitude: event.latlng.lat,
                    longitude: event.latlng.lng,
                  },
                  "*"
                );
              });
            })();
          </script>
        </body>
      </html>
    `;
  }, [interactive, mapId, safeCenter, safeMapType, safeMarkers, safePolylines, zoom]);

  return (
    <View style={[{ flex: 1, overflow: "hidden" }, style]}>
      <iframe
        title="leaflet-map"
        srcDoc={html}
        style={{ border: 0, width: "100%", height: "100%" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </View>
  );
}
