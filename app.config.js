export default {
  expo: {
    name: process.env.NODE_ENV === 'production' ? 'White Heart' : 'White Heart (Dev)',
    slug: 'white-heart-taxi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#3B82F6'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.whiteheart.driver'
    },
    android: {
      package: 'com.whiteheart.driver',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
        'RECORD_AUDIO',
        'CALL_PHONE',
        'INTERNET',
        'ACCESS_NETWORK_STATE'
      ]
    },
    web: {
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      'expo-location',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow White Heart to access your camera to take profile photos.'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: 'edbf3288-0fb6-4da9-9353-3bf9b13bd351' // 👈 required for EAS builds
      }
    }
  }
};
