// app/lib/apiUrl.ts
import { Platform } from "react-native";
import Constants from "expo-constants";

const isAndroid = Platform.OS === "android";

// ✅ Read baked-in config from app.config.js -> extra
export const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  (isAndroid ? "http://10.0.2.2:4000" : "http://localhost:4000");
