self.addEventListener("push", (event) => {
  let payload = {
    title: "通知",
    body: "新しい通知があります",
    url: "/",
  };

  try {
    const data = event.data?.json();
    if (data && typeof data === "object") {
      payload = {
        title: data.title || payload.title,
        body: data.body || payload.body,
        url: data.url || payload.url,
      };
    }
  } catch {
    // JSON でない payload は既定文言を使う
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/themeIcon/DOPPEL_ICON.png",
      badge: "/themeIcon/DOPPEL_ICON.png",
      data: {
        url: payload.url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
