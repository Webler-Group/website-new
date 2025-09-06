import { useState, useEffect } from "react";
import { useApi } from "../../../context/apiCommunication";

export function usePushNotifications() {
    const [subscribed, setSubscribed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { sendJsonRequest } = useApi();

    const isSupported = "serviceWorker" in navigator && "PushManager" in window;

    useEffect(() => {
        if (!isSupported) {
            setError("Push notifications are not supported in this browser.");
            return;
        }

        const checkSubscription = async () => {
            try {
                const registration = await navigator.serviceWorker.getRegistration("/workers/push-service-worker.js");
                if (!registration) return;

                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) setSubscribed(true);
            } catch (err: any) {
                console.error("Error checking existing subscription:", err);
            }
        };

        checkSubscription();
    }, [isSupported]);

    const subscribe = async () => {
        if (!isSupported) return;

        try {
            const registration = await navigator.serviceWorker.register("/workers/push-service-worker.js");
            const result = await sendJsonRequest("/PushNotifications/GetPublicKey", "POST", {});
            if (!result?.publicKey) throw new Error("Cannot get public key");

            const convertedVapidKey = urlBase64ToUint8Array(result.publicKey);

            let existingSub = await registration.pushManager.getSubscription();
            if (!existingSub) {
                existingSub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });

                await sendJsonRequest("/PushNotifications/Subscribe", "POST", { subscription: existingSub });
            }

            setSubscribed(true);
        } catch (err: any) {
            console.error("Push subscription error:", err);
            setError(err.message || "Failed to subscribe to push notifications.");
        }
    }

    const unsubscribe = async () => {
        if (!isSupported) return;

        try {
            const registration = await navigator.serviceWorker.getRegistration("/workers/push-service-worker.js");
            if (!registration) return;

            const existingSub = await registration.pushManager.getSubscription();
            if (existingSub) {
                await existingSub.unsubscribe();
                await sendJsonRequest("/PushNotifications/Unsubscribe", "POST", { endpoint: existingSub.endpoint });
                setSubscribed(false);
            }
        } catch (err: any) {
            console.error("Push unsubscription error:", err);
            setError(err.message || "Failed to unsubscribe from push notifications.");
        }
    }

    return { subscribed, error, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}