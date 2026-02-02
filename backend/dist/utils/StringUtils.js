"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimAtWordBoundary = exports.truncate = void 0;
function truncate(text, maxLength) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const graphemes = Array.from(segmenter.segment(text), g => g.segment);
    if (graphemes.length > maxLength) {
        return graphemes.slice(0, maxLength).join("") + "...";
    }
    return text;
}
exports.truncate = truncate;
const trimAtWordBoundary = (s, max) => {
    const text = String(s ?? "");
    if (text.length <= max)
        return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace < 120)
        return cut.trim();
    return cut.slice(0, lastSpace).trim();
};
exports.trimAtWordBoundary = trimAtWordBoundary;
