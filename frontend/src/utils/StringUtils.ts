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