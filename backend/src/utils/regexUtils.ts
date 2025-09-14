export function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function escapeHtml(str: string) {
    return str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function escapeMarkdown(str: string): string {
    if (!str) return "";

    // First handle links: [text](url) -> text
    str = str.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // Escape GitHub-flavored Markdown special characters
    // Characters to escape: \ ` * _ { } [ ] ( ) # + - . ! | > ~
    return str.replace(/([\\`*_{}[\]()#+\-.!|>~])/g, "\\$1");
}

export function isEmail(value: string) {
    const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return value.match(validEmailRegex) !== null;
}