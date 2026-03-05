// Keep startup resilient: never let fetch polyfill initialization crash app boot.
try {
  // Use require so errors in fetch module can be caught at runtime.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('./fetch');
  const updatedFetch = mod?.default;
  if (typeof updatedFetch === 'function') {
    // @ts-ignore
    global.fetch = updatedFetch;
  }
} catch {
  // If the custom fetch wrapper fails, keep the platform default fetch.
}
