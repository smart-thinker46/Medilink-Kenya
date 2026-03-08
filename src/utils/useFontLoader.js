import { useFonts } from "expo-font";
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from "@expo-google-fonts/nunito-sans";

export const useAppFonts = () => {
  const [fontsLoaded] = useFonts({
    // Keep existing font keys used across the app,
    // but point all of them to Nunito Sans weights.
    Inter_400Regular: NunitoSans_400Regular,
    Inter_500Medium: NunitoSans_500Medium,
    Inter_600SemiBold: NunitoSans_600SemiBold,
    Inter_700Bold: NunitoSans_700Bold,
    Nunito_600SemiBold: NunitoSans_600SemiBold,
    Nunito_700Bold: NunitoSans_700Bold,
  });

  return fontsLoaded;
};
