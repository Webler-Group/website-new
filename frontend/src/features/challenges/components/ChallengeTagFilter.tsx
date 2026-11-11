import { cx } from "../../../components/ui";
import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { ChallengeTagCount } from "../types";

interface ChallengeTagFilterProps {
    tags: ChallengeTagCount[];
    active: string | null;
    onSelect: (tag: string | null) => void;
}

const ChallengeTagFilter = ({ tags, active, onSelect }: ChallengeTagFilterProps) => {
    const [expanded, setExpanded] = useState(false);
    if (tags.length === 0) return null;

    // The selected tag goes first so it stays visible while the list is collapsed to one row
    const shown = active ? [...tags.filter(t => t.name === active), ...tags.filter(t => t.name !== active)] : tags;

    return (
        <div className={cx("wb-challenges-tag-filter", expanded && "wb-challenges-tag-filter--expanded")}>
            <div className="wb-challenges-tag-filter-chips">
                <button type="button" className={cx("wb-challenges-tag-chip", !active && "wb-challenges-tag-chip--active")} onClick={() => onSelect(null)}>
                    All topics
                </button>
                {shown.map(tag => (
                    <button
                        type="button"
                        key={tag.name}
                        className={cx("wb-challenges-tag-chip", active === tag.name && "wb-challenges-tag-chip--active")}
                        onClick={() => onSelect(active === tag.name ? null : tag.name)}
                    >
                        {tag.name}<span className="wb-challenges-tag-chip-count">{tag.count}</span>
                    </button>
                ))}
            </div>
            {tags.length > 6 && (
                <button type="button" className="wb-challenges-tag-filter-toggle" onClick={() => setExpanded(e => !e)}>
                    {expanded ? <>Show less <FaChevronUp size={10} /></> : <>Show all {tags.length} topics <FaChevronDown size={10} /></>}
                </button>
            )}
        </div>
    );
};

export default ChallengeTagFilter;
