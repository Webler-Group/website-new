export function truncate(text: string, maxLength: number): string {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const graphemes = Array.from(segmenter.segment(text), g => g.segment);

    if (graphemes.length > maxLength) {
        return graphemes.slice(0, maxLength).join("") + "...";
    }
    return text;
}

export const trimAtWordBoundary = (s: string, max: number) => {
    const text = String(s ?? "");
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace < 120) return cut.trim();
    return cut.slice(0, lastSpace).trim();
};