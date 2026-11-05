// Admin Notification Push Service Stubs
export const VAPID_KEY = "";

export const requestFcmToken = async () => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted' ? 'browser-granted' : null;
    } catch (e) {
      console.warn('Notification permission request error:', e);
    }
  }
  return null;
};

export const onForegroundMessage = (callback) => {
  return () => {};
};

