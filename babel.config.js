// Mirrors Expo's default Babel setup (Metro applies babel-preset-expo even
// without this file); making it explicit so jest can transform TS/JSX.
// PR2 will append 'react-native-reanimated/plugin' here — it MUST stay LAST.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
