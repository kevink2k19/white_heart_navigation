// app.config.js
import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

export default {
  expo: {
    name: isProd ? 'White Heart' : 'White Heart (Dev)',
    slug: 'white-heart-taxi',
    scheme: 'whiteheart',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    splash: { image: './assets/images/splash.png', resizeMode: 'contain', backgroundColor: '#3B82F6' },
    assetBundlePatterns: ['**/*'],

    extra: {
      // 🔗 Use your generated Railway domain here (HTTPS!)
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL, // e.g. https://<app>.up.railway.app
      // If you call Directions REST from the app:
      EXPO_PUBLIC_GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
      eas: { projectId: 'edbf3288-0fb6-4da9-9353-3bf9b13bd351' }
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.whiteheart.driver',
      buildNumber: '1',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'We use your location for navigation.'
        // If you later need background tracking, add:
        // NSLocationAlwaysAndWhenInUseUsageDescription: 'We use your location to track trips even in the background.',
        // UIBackgroundModes: ['location'],
      },
      // ✅ iOS Maps SDK key from EAS secret
      config: { googleMapsApiKey: process.env.IOS_GOOGLE_MAPS_API_KEY }
    },

    android: {
      package: 'com.whiteheart.driver',
      versionCode: 1, // bump for each production release
      adaptiveIcon: { foregroundImage: './assets/images/adaptive-icon.png', backgroundColor: '#ffffff' },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        // 'ACCESS_BACKGROUND_LOCATION', // uncomment if you add background tracking
        // 'FOREGROUND_SERVICE',
        'CAMERA',
        'RECORD_AUDIO',
        'CALL_PHONE',
        'INTERNET',
        'ACCESS_NETWORK_STATE'
      ],
      // ✅ Android Maps SDK key from EAS secret
      config: {
        googleMaps: { apiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY }
      }
    },

    web: { favicon: './assets/images/favicon.png' },

    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      'expo-location',
      'expo-secure-store',
      ['expo-camera', { cameraPermission: 'Allow White Heart to access your camera to take profile photos.' }]
    ],

    experiments: { typedRoutes: true }
  }
};
