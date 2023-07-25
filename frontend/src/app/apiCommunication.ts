import { BASE_URL } from "../config/config";
import { authenticate } from "../features/auth/context/authContext";

class ApiCommunication {
    static #instance: ApiCommunication | null = null;

    static #get() {
        if (this.#instance === null) {
            this.#instance = new ApiCommunication();
        }
        return this.#instance;
    }

    baseUrl: string;
    accessToken: string | null;
    expiresIn: number;

    constructor() {
        this.baseUrl = BASE_URL;
        this.accessToken = null;
        this.expiresIn = 0;
    }

    static setAccessToken(accessToken: string | null, expiresIn: number) {
        const _this = this.#get();
        _this.accessToken = accessToken;
        _this.expiresIn = expiresIn;
    }

    async fetchQuery(path: string, options: { method: string; headers: { contentType: string; }; body?: any; signal?: AbortSignal; }) {
        return await fetch(this.baseUrl + path, {
            method: options.method,
            credentials: "include",
            mode: "cors",
            headers: {
                "Content-Type": options.headers.contentType,
                "Authorization": this.accessToken ? "Bearer " + this.accessToken : ""
            },
            body: options.method != "GET" ? JSON.stringify(options.body) : undefined,
            signal: options.signal
        });
    }

    async fetchQueryWithReauthentication(path: string, options: { method: string; headers: { contentType: string; }; body?: any; signal?: AbortSignal; }) {
        if (!path.startsWith("/Auth") && this.accessToken && this.expiresIn <= Date.now()) {
            const result = await this.fetchQuery("/Auth/Refresh", {
                method: "GET",
                headers: {
                    contentType: "application/json"
                }
            })
                .then(response => response.json());
            if (result && result.accessToken && result.expiresIn) {
                authenticate(result.accessToken, result.expiresIn);
            }
        }

        return await this.fetchQuery(path, {
            ...options
        });

    }

    static async sendJsonRequest(path: string, method: string, body: any = {}, options = {}) {
        const _this = this.#get();

        const response = await _this.fetchQueryWithReauthentication(path, {
            headers: {
                contentType: "application/json"
            },
            method,
            body,
            ...options
        });

        const data = await response.json();

        return data;
    }
}

export default ApiCommunication;