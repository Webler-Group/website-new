import { cx } from "./utils";

interface PaginationProps {
    /** Current page (1-based) */
    page: number;
    /** Total number of items */
    total: number;
    /** Items per page */
    limit: number;
    changePage: (page: number) => void;
    /** Number of page links shown on each side of the current page */
    between?: number;
    /** Number of page links shown at both ends, separated by an ellipsis */
    ellipsis?: number;
    className?: string;
}

type PageEntry = number | "ellipsis-start" | "ellipsis-end";

function getPages(page: number, pageCount: number, between: number, ellipsis: number): PageEntry[] {
    const windowSize = between * 2 + 1 + ellipsis * 2 + 2;
    if (pageCount <= windowSize) {
        return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    let start = Math.max(1, page - between);
    let end = Math.min(pageCount, page + between);
    // Keep the middle window size constant near the edges
    if (start <= ellipsis + 2) {
        start = 1;
        end = Math.max(end, between * 2 + ellipsis + 2);
    }
    if (end >= pageCount - ellipsis - 1) {
        end = pageCount;
        start = Math.min(start, pageCount - between * 2 - ellipsis - 1);
    }

    const pages: PageEntry[] = [];
    if (start > 1) {
        for (let i = 1; i <= ellipsis; i++) pages.push(i);
        pages.push("ellipsis-start");
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < pageCount) {
        pages.push("ellipsis-end");
        for (let i = pageCount - ellipsis + 1; i <= pageCount; i++) pages.push(i);
    }
    return pages;
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
