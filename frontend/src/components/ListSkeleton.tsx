import { cx, Placeholder } from "./ui";

interface ListSkeletonProps {
    count: number;
    /**
     * - `card`: bordered card with a title and two text lines (posts, questions, codes, courses)
     * - `compact`: small two-line entry (sidebars)
     * - `row`: single line row (tables, leaderboard)
     */
    variant?: "card" | "compact" | "row";
    className?: string;
}

/**
 * Placeholder list shown while data is loading, so the page keeps roughly the size
 * it will have once loaded instead of jumping from a small spinner to full content.
 */
const ListSkeleton = ({ count, variant = "card", className }: ListSkeletonProps) => {
    const items = Array.from({ length: count }, (_, i) => {
        switch (variant) {
            case "row":
                return (
                    <Placeholder key={i} as="div" animation="glow" className="px-3 py-2 border-bottom">
                        <Placeholder xs={i % 2 === 0 ? 7 : 5} />
                    </Placeholder>
                );
            case "compact":
                return (
                    <Placeholder key={i} as="div" animation="glow" className="px-3 py-2 border-bottom">
                        <Placeholder xs={9} size="sm" />
                        <Placeholder xs={5} size="xs" className="d-block mt-1" />
                    </Placeholder>
                );
            default:
                return (
                    <div key={i} className="rounded border p-2 mb-2 bg-body">
                        <Placeholder as="h3" animation="glow">
                            <Placeholder xs={4} />
                        </Placeholder>
                        <Placeholder as="p" animation="glow" className="mb-0">
                            <Placeholder xs={12} />
                            <Placeholder xs={8} />
                        </Placeholder>
                    </div>
                );
        }
    });

    return <div className={cx(className)} aria-busy="true" aria-label="Loading">{items}</div>;
};

export default ListSkeleton;
