import * as Notifications from 'expo-notifications';

// Show the alert even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

let permissionAsked = false;

// Ask for notification permission once. Returns false (never throws) if the
// user denies or the platform/Expo Go build can't grant it — callers then fall
// back to the foreground haptic + visual cue.
export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!permissionAsked) {
      permissionAsked = true;
      const req = await Notifications.requestPermissionsAsync();
      return req.granted;
    }
    return false;
  } catch {
    return false;
  }
}

// Schedule a "rest over" notification `seconds` from now. Returns the id to
// cancel it, or null if scheduling wasn't possible (degrades gracefully).
export async function scheduleRestDone(seconds: number): Promise<string | null> {
  try {
    const ok = await ensurePermission();
    if (!ok) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest done', body: 'Time for your next set 💪', sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch {
    return null;
  }
}

export async function cancelRest(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* already fired or unavailable */
  }
}
