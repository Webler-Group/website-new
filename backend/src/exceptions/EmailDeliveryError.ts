class EmailDeliveryError extends Error {

    cause?: unknown;

    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = "EmailDeliveryError";
        this.cause = cause;
    }
}

export default EmailDeliveryError;