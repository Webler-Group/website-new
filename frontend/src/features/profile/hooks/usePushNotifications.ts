import { useState, useEffect } from "react";
import { useApi } from "../../../context/apiCommunication";
import { PublicKeyData } from "../types";
import { urlBase64ToUint8Array } from "../../../utils/StringUtils";

const SW_PATH = "/workers/push-service-worker.js";

const isSupported =
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

export function usePushNotifications() {
    const [subscribed, setSubscribed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { sendJsonRequest } = useApi();

    const getRegistration = () => navigator.serviceWorker.getRegistration(SW_PATH);

    useEffect(() => {
        if (!isSupported) {
            setError("Push notifications are not supported in this browser.");
            return;
        }

        const checkSubscription = async () => {
            try {
                const registration = await getRegistration();
                if (!registration) return;

                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) setSubscribed(true);
            } catch (err) {
                console.error("Error checking existing subscription:", err);
            }
        };

        checkSubscription();
    }, []);

    const subscribe = async () => {
        if (!isSupported) return;

        try {
            const registration = await navigator.serviceWorker.register(SW_PATH);
            const result = await sendJsonRequest<PublicKeyData>("/PushNotifications/GetPublicKey", "POST", {});
            if (!result.data) throw new Error("Cannot get public key");

            const convertedVapidKey = urlBase64ToUint8Array(result.data.publicKey);

            let existingSub = await registration.pushManager.getSubscription();
            if (!existingSub) {
                existingSub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey,
                });
                await sendJsonRequest("/PushNotifications/Subscribe", "POST", { subscription: existingSub });
            }

            setSubscribed(true);
        } catch (err) {
            console.error("Push subscription error:", err);
            setError("Failed to subscribe to push notifications.");
        }
    };

    const unsubscribe = async () => {
        if (!isSupported) return;

        try {
            const registration = await getRegistration();
            if (!registration) return;

            const existingSub = await registration.pushManager.getSubscription();
            if (!existingSub) return;

            const endpoint = existingSub.endpoint; // save before invalidating
            await existingSub.unsubscribe();
            const result = await sendJsonRequest("/PushNotifications/Unsubscribe", "POST", { endpoint });
            if (result.success) setSubscribed(false);
        } catch (err) {
            console.error("Push unsubscription error:", err);
            setError("Failed to unsubscribe from push notifications.");
        }
    };

    return { subscribed, error, subscribe, unsubscribe };
}