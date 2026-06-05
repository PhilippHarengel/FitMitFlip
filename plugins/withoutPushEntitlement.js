const { withEntitlementsPlist } = require('@expo/config-plugins');

// expo-notifications adds the `aps-environment` (Push Notifications) entitlement
// automatically. A free Apple personal team cannot provision Push Notifications,
// so signing fails. We only use *local* notifications (the rest timer), which
// don't need that entitlement — strip it so a free account can sign the app.
// Runs as a config plugin so it survives every prebuild / `expo run:ios`.
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
