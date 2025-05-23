import { authenticate } from "../features/auth/context/authContext";

class ApiCommunication {
    static _instance: ApiCommunication | null = null;

    static _get() {
        if (this._instance === null) {
            this._instance = new ApiCommunication();
        }
        return this._instance;
    }

    baseUrl: string;
    accessToken: string | null;
    expiresIn: number;
    _refreshRequestSent = false;

    constructor() {
        this.baseUrl = "/api";
        this.accessToken = null;
        this.expiresIn = 0;
    }

    static setAccessToken(accessToken: string | null, expiresIn: number) {
        const _this = this._get();
        _this.accessToken = accessToken;
        _this.expiresIn = expiresIn;
    }

    async fetchQuery(path: string, options: { method: string; headers?: any; body?: any; signal?: AbortSignal; }, isMultipart: boolean = false) {
        const headers = options.headers ?? {};
        let body;
        if (isMultipart) {
            body = new FormData();
            if (options.body) {
                for (let k in options.body) {
                    body.append(k, options.body[k]);
                }
            }
        } else {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(options.body);
        }
        return await fetch(this.baseUrl + path, {
            method: options.method,
            credentials: "include",
            mode: "cors",
            headers: {
                ...headers,
                "Authorization": this.accessToken ? "Bearer " + this.accessToken : ""
            },
            body: options.method != "GET" ? body : undefined,
            signal: options.signal
        });
    }

    async fetchQueryWithReauthentication(path: string, options: { method: string; body?: any; signal?: AbortSignal; }, isMultipart: boolean = false) {
        if (!path.startsWith("/Auth") && this.accessToken && this.expiresIn <= Date.now()) {
            let authenticated = this._reauthenticate();
            if (!authenticated) {
                location.href = "/Users/Login?returnUrl=" + location.pathname;
            }
        }

        return await this.fetchQuery(path, {
            ...options
        }, isMultipart);

    }

    async _reauthenticate() {
        if (this._refreshRequestSent) {
            let attempts = 5;
            while (attempts > 0) {
                await new Promise((resolve) => {
                    setTimeout(() => resolve(true), 250);
                });
                if(!this._refreshRequestSent) {
                    break;
                }
                --attempts;
            }
            return attempts > 0;
        }
        let authenticated = false;
        this._refreshRequestSent = true;
        const result = await this.fetchQuery("/Auth/Refresh", {
            method: "POST"
        })
            .then(response => response.json());
        if (result && result.accessToken && result.expiresIn) {
            authenticate(result.accessToken, result.expiresIn);
            authenticated = true;
        }
        else {
            authenticate(null);
        }
        this._refreshRequestSent = false;

        return authenticated;
    }

    static async sendJsonRequest(path: string, method: string, body: any = {}, options: any = {}, isMultipart: boolean = false) {
        const _this = this._get();

        const response = await _this.fetchQueryWithReauthentication(path, {
            method,
            body,
            ...options
        }, isMultipart);

        const data = await response.json();

        return data;
    }
}

export default ApiCommunication;