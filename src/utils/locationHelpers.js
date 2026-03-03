const toRad = (value) => (value * Math.PI) / 180;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickCoord = (location, primary, secondary) => {
  const fromPrimary = toNumber(location?.[primary]);
  if (fromPrimary !== null) return fromPrimary;
  return toNumber(location?.[secondary]);
};

export const getDistanceKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const getBearingDegrees = (start, end) => {
  if (!start || !end) return 0;
  const lat1 = toRad(start.latitude);
  const lat2 = toRad(end.latitude);
  const dLon = toRad(end.longitude - start.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  return ((bearing * 180) / Math.PI + 360) % 360;
};

export const normalizeLocation = (location) => {
  if (!location) return null;
  const latitude = pickCoord(location, "latitude", "lat");
  const longitude = pickCoord(location, "longitude", "lng");
  if (latitude === null || longitude === null) {
    return null;
  }
  return {
    ...location,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
  };
};

export const getLocationAddressLabel = (location) => {
  if (!location) return "";
  return (
    location.address ||
    [location.city, location.area].filter(Boolean).join(", ") ||
    "Approximate location"
  );
};

export const getExternalMapUrl = (location, label = "Location") => {
  const normalized = normalizeLocation(location);
  if (!normalized) return "";
  const query = encodeURIComponent(label);
  return `https://www.google.com/maps/search/?api=1&query=${normalized.latitude},${normalized.longitude}%20(${query})`;
};
