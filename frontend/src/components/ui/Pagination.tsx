import { cx } from "./utils";

interface PaginationProps {
    /** Current page (1-based) */
    page: number;
    /** Total number of items */
    total: number;
    /** Items per page */
    limit: number;
    changePage: (page: number) => void;
    /**
     * Size of the page window: at most `between * 2 + 1` slots are shown, including the
     * edge pages and ellipsis markers (same semantics as react-bootstrap-pagination-control).
     */
    between?: number;
    /** Number of edge pages kept at each end, separated by an ellipsis (0 = no edges) */
    ellipsis?: number;
    className?: string;
}

type PageEntry = number | "ellipsis-start" | "ellipsis-end";

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

function getPages(page: number, pageCount: number, between: number, ellipsis: number): PageEntry[] {
    between = Math.max(1, between);
    // Edge pages + their ellipsis must leave room for the current page
    ellipsis = Math.max(0, Math.min(ellipsis, between - 2));
    const slots = between * 2 + 1;

    if (pageCount <= slots) return range(1, pageCount);

    // Slots taken on one side by the edge pages and the "…" marker
    const edge = ellipsis > 0 ? ellipsis + 1 : 0;
    const startEdge: PageEntry[] = ellipsis > 0 ? [...range(1, ellipsis), "ellipsis-start"] : [];
    const endEdge: PageEntry[] = ellipsis > 0 ? ["ellipsis-end", ...range(pageCount - ellipsis + 1, pageCount)] : [];

    if (page - 1 <= between) {
        return [...range(1, slots - edge), ...endEdge];
    }
    if (page + between >= pageCount) {
        return [...startEdge, ...range(pageCount - (slots - edge) + 1, pageCount)];
    }
    const side = between - edge;
    return [...startEdge, ...range(page - side, page + side), ...endEdge];
}

function Pagination({ page, total, limit, changePage, between = 3, ellipsis = 1, className }: PaginationProps) {
    const pageCount = Math.max(1, Math.ceil(total / limit));
    if (total <= limit) return null;

    const go = (target: number) => {
        if (target >= 1 && target <= pageCount && target !== page) changePage(target);
    };

    return (
        <nav aria-label="Pagination">
            <ul className={cx("pagination justify-content-center", className)}>
                <li className={cx("page-item", page <= 1 && "disabled")}>
                    <button type="button" className="page-link" aria-label="Previous" onClick={() => go(page - 1)}>&lsaquo;</button>
                </li>
                {getPages(page, pageCount, between, ellipsis).map(entry =>
                    typeof entry === "number" ? (
                        <li key={entry} className={cx("page-item", entry === page && "active")}>
                            <button type="button" className="page-link" onClick={() => go(entry)}>{entry}</button>
                        </li>
                    ) : (
                        <li key={entry} className="page-item disabled">
                            <span className="page-link">&hellip;</span>
                        </li>
                    )
                )}
                <li className={cx("page-item", page >= pageCount && "disabled")}>
                    <button type="button" className="page-link" aria-label="Next" onClick={() => go(page + 1)}>&rsaquo;</button>
                </li>
            </ul>
        </nav>
    );
}

export default Pagination;
