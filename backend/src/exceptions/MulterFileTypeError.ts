class MulterFileTypeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MulterFileTypeError";
    }
}

export default MulterFileTypeError;