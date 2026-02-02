export const truncate = (text: string, maxLength: number): string => {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const graphemes = Array.from(segmenter.segment(text), g => g.segment);

    if (graphemes.length > maxLength) {
        return graphemes.slice(0, maxLength).join("") + "...";
    }
    return text;
}

export const uuid = () => {
    if (typeof crypto?.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export const genMongooseId = () => {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);

    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    return (timestamp + randomPart).padEnd(24, "0");
};


export const sanitizeFilename = (name: string) => {
    return name
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 80);
};