const safeSerializeError = (error) => {
  if (!error) return null;
  const base = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
  try {
    return { ...base, ...error };
  } catch (_err) {
    return base;
  }
};

const normalizeBaseUrl = (raw) => String(raw || '').trim().replace(/\/+$/, '');

const buildEndpointCandidates = () => {
  const explicitEndpoint = String(process.env.EXPO_PUBLIC_LOGS_ENDPOINT || '').trim();
  const baseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_BASE_URL);
  const backendEndpoint = baseUrl ? `${baseUrl}/client-logs` : '';
  return [explicitEndpoint, backendEndpoint].filter(Boolean);
};

const buildAuthHeaders = () => {
  const key = String(
    process.env.EXPO_PUBLIC_CLIENT_LOGS_API_KEY || process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY || '',
  ).trim();
  if (!key) return {};
  return {
    Authorization: `Bearer ${key}`,
    'x-client-log-key': key,
  };
};

const reportErrorToRemote = async ({ error }) => {
  const endpoints = buildEndpointCandidates();
  if (!endpoints.length) {
    return { success: false };
  }

  const payload = {
    projectGroupId: process.env.EXPO_PUBLIC_PROJECT_GROUP_ID || 'medilink-mobile',
    logs: [
      {
        message: JSON.stringify(safeSerializeError(error)),
        timestamp: new Date().toISOString(),
        level: 'error',
      },
    ],
  };

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (response?.ok) {
        return { success: true };
      }
    } catch (_fetchError) {
      // Try next endpoint candidate.
    }
  }

  return { success: false };
};

module.exports = { reportErrorToRemote };
