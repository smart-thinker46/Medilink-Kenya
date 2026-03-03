export async function isAvailableAsync() {
  return false;
}

export async function shareAsync() {
  throw new Error('expo-sharing is not available on web.');
}

export default {
  isAvailableAsync,
  shareAsync,
};
