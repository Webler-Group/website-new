self.addEventListener("push", function (event) {
    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const title = data.title || "Notification";
    const options = {
        body: data.body || "",
        icon: "/resources/images/logoicon.png",
        data: data.url || "/"
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    const url = event.notification.data;
    event.waitUntil(clients.openWindow(url));
});
