export const useAppFonts = () => {
  // Fail-open in production builds: missing optional font packages
  // should never block app bootstrap or splash hide.
  return true;
};
