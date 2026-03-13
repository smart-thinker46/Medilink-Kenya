const warnOnce = (() => {
  let warned = false;
  return () => {
    if (warned) return;
    warned = true;
    // eslint-disable-next-line no-console
    console.warn("Push notifications are disabled on web builds.");
  };
})();

export const registerDeviceToken = async () => {
  warnOnce();
  return null;
};

export const setupPushHandlers = () => {
  warnOnce();
};

export const syncBadgeCount = async () => {
  warnOnce();
};
