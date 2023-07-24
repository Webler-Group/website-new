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

    constructor() {
        this.baseUrl = BASE_URL;
        this.accessToken = null;
    }

    static setAccessToken(accessToken: string | null) {
        this.#get().accessToken = accessToken;
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

    static async sendJsonRequest(path: string, method: string, body: any = {}, options = {}) {
        const _this = this.#get();

        let response = await _this.fetchQuery(path, {
            headers: {
                contentType: "application/json"
            },
            method,
            body
        });
        if (response.status === 403 && _this.accessToken) {
            const data = await this.sendJsonRequest("/Auth/Refresh", "GET");
            if (data?.accessToken) {
                authenticate(data.accessToken);
                response = await _this.fetchQuery(path, {
                    headers: {
                        contentType: "application/json"
                    },
                    method,
                    body,
                    ...options
                });
            }
        }

        const data = await response.json();

        return data;
    }
}

export default ApiCommunication;