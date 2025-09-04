"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncate = void 0;
function truncate(text, maxLength) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const graphemes = Array.from(segmenter.segment(text), g => g.segment);
    if (graphemes.length > maxLength) {
        return graphemes.slice(0, maxLength).join("") + "...";
    }
    return text;
}
exports.truncate = truncate;
