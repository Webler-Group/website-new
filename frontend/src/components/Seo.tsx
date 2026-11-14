import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Per-page SEO metadata (title, description, canonical, OpenGraph/Twitter, robots).
 *
 * Tags are updated in place on the tags that already exist in index.html, so the head never
 * contains duplicates and crawlers that don't run JS still see the index.html defaults.
 *
 * Several pages/layouts may call useSeo at once: values are merged field by field and the
 * component rendered later (deeper in the tree / newer page) wins. When all callers unmount,
 * the index.html defaults are restored.
 */
export interface SeoProps {
    /** Page title without the site suffix (" | Webler Codes" is appended). Empty = site default. */
    title?: string;
    description?: string;
    /** Absolute URL or site-relative path of the preview image */
    image?: string;
    type?: "website" | "article" | "profile";
    /** Canonical path (e.g. "/Discuss/123"); defaults to the current pathname */
    path?: string;
    /** Exclude the page from search results (private, auth-only or utility pages) */
    noIndex?: boolean;
}

export const SITE_NAME = "Webler Codes";
export const SITE_URL = "https://www.weblercodes.com";

type MetaAttr = "name" | "property";

const META_TAGS: [MetaAttr, string][] = [
    ["name", "description"],
    ["name", "robots"],
    ["property", "og:type"],
    ["property", "og:url"],
    ["property", "og:title"],
    ["property", "og:description"],
    ["property", "og:image"],
    ["name", "twitter:url"],
    ["name", "twitter:title"],
    ["name", "twitter:description"],
    ["name", "twitter:image"],
];

let nextId = 0;
const entries = new Map<number, SeoProps>();
let defaults: { title: string; meta: Map<string, string | null> } | null = null;

const metaKey = (attr: MetaAttr, name: string) => `${attr}:${name}`;

const findMeta = (attr: MetaAttr, name: string) =>
    document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);

const captureDefaults = () => {
    if (defaults) return defaults;
    const meta = new Map<string, string | null>();
    for (const [attr, name] of META_TAGS) {
        meta.set(metaKey(attr, name), findMeta(attr, name)?.content ?? null);
    }
    defaults = { title: document.title, meta };
    return defaults;
};

const setMeta = (attr: MetaAttr, name: string, content: string | null | undefined) => {
    let el = findMeta(attr, name);
    if (content == null || content === "") {
        el?.remove();
        return;
    }
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
    }
    el.content = content;
};

const setCanonical = (href: string | null) => {
    let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!href) {
        el?.remove();
        return;
    }
    if (!el) {
        el = document.createElement("link");
        el.rel = "canonical";
        document.head.appendChild(el);
    }
    el.href = href;
};

const absoluteUrl = (url: string) => /^https?:\/\//i.test(url) ? url : SITE_URL + (url.startsWith("/") ? url : "/" + url);

const canonicalUrl = (path: string) => {
    const clean = path.split(/[?#]/)[0].replace(/\/+$/, "");
    return SITE_URL + (clean || "/");
};

const apply = () => {
    const def = captureDefaults();
    const merged: SeoProps = {};
    // Map keeps insertion order, but ids reflect render order, which is what decides priority
    [...entries.entries()]
        .sort((a, b) => a[0] - b[0])
        .forEach(([, props]) => {
            for (const [k, v] of Object.entries(props)) {
                if (v !== undefined && v !== "") (merged as any)[k] = v;
            }
        });

    const defMeta = (attr: MetaAttr, name: string) => def.meta.get(metaKey(attr, name)) ?? null;

    const title = merged.title && merged.title !== SITE_NAME ? `${merged.title} | ${SITE_NAME}` : def.title;
    const description = merged.description ?? defMeta("name", "description");
    const image = merged.image ? absoluteUrl(merged.image) : defMeta("property", "og:image");
    const url = canonicalUrl(merged.path ?? window.location.pathname);

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", merged.noIndex ? "noindex" : defMeta("name", "robots"));
    setMeta("property", "og:type", merged.type ?? defMeta("property", "og:type"));
    setMeta("property", "og:url", url);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:url", url);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
    setCanonical(merged.noIndex ? null : url);
};

export function useSeo({ title, description, image, type, path, noIndex }: SeoProps) {
    // Ids are taken during render: parents render before children and new pages after old ones
    const [id] = useState(() => ++nextId);
    const { pathname } = useLocation();

    useEffect(() => {
        entries.set(id, { title, description, image, type, path, noIndex });
        apply();
        return () => {
            entries.delete(id);
            apply();
        };
    }, [id, title, description, image, type, path, noIndex, pathname]);
}

const Seo = (props: SeoProps) => {
    useSeo(props);
    return null;
};

/** Plain-text excerpt for meta descriptions (strips markdown/HTML, collapses whitespace) */
export const toExcerpt = (text: string | null | undefined, maxLength = 160) => {
    if (!text) return undefined;
    const plain = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#>*_`~|]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!plain) return undefined;
    return plain.length > maxLength ? plain.slice(0, maxLength - 1).trimEnd() + "…" : plain;
};

export default Seo;
