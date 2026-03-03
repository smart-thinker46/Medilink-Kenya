import React, { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

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

const serializeForScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

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

export default function LeafletMap({
  style,
  center,
  zoom = 14,
  markers = [],
  polylines = [],
  mapType = "standard",
  onPress,
  interactive = true,
}) {
  const safeCenter = useMemo(() => {
    const normalized = normalizeCoordinate(center);
    return normalized || DEFAULT_CENTER;
  }, [center]);
  const safeMarkers = useMemo(() => sanitizeMarkers(markers), [markers]);
  const safePolylines = useMemo(() => sanitizePolylines(polylines), [polylines]);
  const safeMapType = useMemo(
    () => (Object.prototype.hasOwnProperty.call(TILE_LAYERS, mapType) ? mapType : "standard"),
    [mapType],
  );

  const html = useMemo(() => {
    const centerScript = serializeForScript([safeCenter.latitude, safeCenter.longitude]);
    const markersScript = serializeForScript(safeMarkers);
    const polylinesScript = serializeForScript(safePolylines);
    const tileLayerScript = serializeForScript(TILE_LAYERS[safeMapType] || TILE_LAYERS.standard);
    const initialZoom = Math.max(3, Math.min(19, toNumber(zoom, 14)));
    const isInteractive = interactive ? "true" : "false";

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossorigin=""
          />
          <style>
            html, body, #map {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            body { background: #E5E7EB; }
            .marker-label {
              font-size: 14px;
              font-weight: 700;
              color: #111827;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
          <script>
            (function () {
              const center = ${centerScript};
              const markers = ${markersScript};
              const polylines = ${polylinesScript};
              const tileLayer = ${tileLayerScript};
              const interactive = ${isInteractive};

              const map = L.map("map", {
                zoomControl: interactive,
                dragging: interactive,
                scrollWheelZoom: interactive,
                doubleClickZoom: interactive,
                touchZoom: interactive,
                boxZoom: interactive,
                keyboard: interactive,
                attributionControl: false,
              }).setView(center, ${initialZoom});

              L.tileLayer(tileLayer.url, {
                maxZoom: Number.isFinite(tileLayer.maxZoom) ? tileLayer.maxZoom : 19,
                subdomains: Array.isArray(tileLayer.subdomains) ? tileLayer.subdomains : undefined,
              }).addTo(map);

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
                const escapeHtml = (value) =>
                  String(value || "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
                const circle = L.circleMarker(latLng, {
                  radius: 7,
                  color: marker.color || "#1D4ED8",
                  fillColor: marker.color || "#1D4ED8",
                  fillOpacity: 0.9,
                  weight: 2,
                }).addTo(map);
                if (marker.title || marker.description) {
                  circle.bindPopup(
                    "<strong>" + escapeHtml(marker.title || "Location") + "</strong>" +
                    (marker.description ? "<br/>" + escapeHtml(marker.description) : "")
                  );
                }
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
                map.fitBounds(bounds, { padding: [25, 25] });
              }

              map.on("click", function (event) {
                if (!window.ReactNativeWebView) return;
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({
                    type: "map-press",
                    latitude: event.latlng.lat,
                    longitude: event.latlng.lng,
                  })
                );
              });
            })();
          </script>
        </body>
      </html>
    `;
  }, [interactive, safeCenter, safeMapType, safeMarkers, safePolylines, zoom]);

  return (
    <View style={[{ flex: 1, overflow: "hidden" }, style]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={(event) => {
          if (typeof onPress !== "function") return;
          try {
            const payload = JSON.parse(event?.nativeEvent?.data || "{}");
            if (payload?.type !== "map-press") return;
            onPress({
              latitude: toNumber(payload.latitude, NaN),
              longitude: toNumber(payload.longitude, NaN),
            });
          } catch {
            // Ignore malformed message events.
          }
        }}
      />
    </View>
  );
}
