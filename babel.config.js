module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [        // if you use Expo Router
      'react-native-reanimated/plugin', // MUST be last
    ],
  };
};
