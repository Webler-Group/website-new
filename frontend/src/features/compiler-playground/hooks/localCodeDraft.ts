/**
 * Local (browser) backup of code edited while the client was offline.
 * Stored in localStorage so it survives closing the tab / browser.
 */

const KEY_PREFIX = "wb-code-draft:";

export interface LocalCodeDraft {
    source: string;
    cssSource: string;
    jsSource: string;
    /** Server `updatedAt` of the version the local edits are based on (null for never-saved code) */
    baseUpdatedAt: string | null;
    /** Client timestamp (ms) of the last local backup */
    savedAt: number;
}

export const getCodeDraftKey = (userId: string | null | undefined, codeId: string | undefined, language: string | null | undefined) => {
    const owner = userId ?? "anon";
    if (codeId) return `${KEY_PREFIX}${owner}:${codeId}`;
    if (language) return `${KEY_PREFIX}${owner}:new:${language}`;
    return null;
};

export const loadCodeDraft = (key: string): LocalCodeDraft | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const draft = JSON.parse(raw) as LocalCodeDraft;
        if (typeof draft?.source !== "string" || typeof draft.savedAt !== "number") return null;
        return {
            source: draft.source,
            cssSource: draft.cssSource ?? "",
            jsSource: draft.jsSource ?? "",
            baseUpdatedAt: draft.baseUpdatedAt ?? null,
            savedAt: draft.savedAt
        };
    } catch {
        return null;
    }
};

export const saveCodeDraft = (key: string, draft: LocalCodeDraft) => {
    try {
        localStorage.setItem(key, JSON.stringify(draft));
        return true;
    } catch {
        // Quota exceeded / storage disabled
        return false;
    }
};

export const removeCodeDraft = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
};

/**
 * Decide whether a local draft should be restored over the server version.
 * - Server unchanged since the draft's base version -> restore the draft.
 * - Server changed in the meantime (e.g. edited on another device) -> the newer one wins.
 */
export const shouldRestoreCodeDraft = (draft: LocalCodeDraft, serverUpdatedAt: string | null | undefined) => {
    if (!draft.baseUpdatedAt || !serverUpdatedAt) return true;
    const base = Date.parse(draft.baseUpdatedAt);
    const server = Date.parse(serverUpdatedAt);
    if (isNaN(base) || isNaN(server)) return true;
    if (server <= base) return true;
    return draft.savedAt > server;
};
