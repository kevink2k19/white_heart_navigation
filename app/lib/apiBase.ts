// app/lib/apiBase.ts
import { Platform } from "react-native";
import Constants from "expo-constants";

const isAndroid = Platform.OS === "android";
const ENV_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export const getApiBase = () => {
  if (ENV_URL) return ENV_URL;

  // sensible defaults for local emulator/simulator
  if (isAndroid) return "http://10.0.2.2:4000"; 
  if (Platform.OS === "ios") return "http://localhost:4000";   
  return "http://localhost:4000";
};
