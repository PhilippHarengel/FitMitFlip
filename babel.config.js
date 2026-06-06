// Mirrors Expo's default Babel setup (Metro applies babel-preset-expo even
// without this file); making it explicit so jest can transform TS/JSX.
// NOTE: babel-preset-expo (SDK 54) auto-adds `react-native-worklets/plugin`
// (the Reanimated v4 worklets transform) when the package is installed, so do
// NOT add it manually here — that would double-apply it and break the build.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
