const TextUtils = (function () {

    function isValidUrl(_string: string) {
        const matchpattern = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/gm;
        return matchpattern.test(_string);
    }

    function escapeHtml(unsafe: string) {
        return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function isImageUrl(url: string) {
        return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(url);
    }

    return {
        isValidUrl,
        isImageUrl,
        escapeHtml
    }

})()

export default TextUtils