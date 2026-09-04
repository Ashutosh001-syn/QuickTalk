self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const title = data.title || 'New Message';
        const options = {
            body: data.body || 'You have received a new message.',
            icon: data.icon || '/favicon.ico',
            badge: '/favicon.ico',
            data: data.url || '/'
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    // Open the app when the notification is clicked
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function(clientList) {
            // If window is already open, focus it
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data);
            }
        })
    );
});
