import axios from 'axios';

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const registerAndSubscribePush = async () => {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push messaging is not supported');
            return;
        }

        // Register Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');

        // Request Notification Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return;
        }

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Subscribe to push notifications
            const publicVapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
            const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
            console.log('Subscribed to push notifications');
        }

        // Send subscription to backend
        await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/subscribe-push`, {
            subscription
        }, {
            withCredentials: true
        });
        
    } catch (error) {
        console.error('Error during push subscription:', error);
    }
};
