class MulterFileTypeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MulterFileTypeError";
        Object.setPrototypeOf(this, MulterFileTypeError.prototype);
    }
}

export default MulterFileTypeError;