import { cx } from "../../../components/ui";
import { Link } from "react-router-dom";

interface ChallengeTagsProps {
    tags?: string[];
    className?: string;
    onSelect?: (tag: string) => void;
    /** Show at most this many tags, then "+N" */
    max?: number;
}

const ChallengeTags = ({ tags, className, onSelect, max }: ChallengeTagsProps) => {
    if (!tags || tags.length === 0) return null;
    const shown = max ? tags.slice(0, max) : tags;
    const hidden = tags.length - shown.length;

    return (
        <div className={cx("wb-challenges-tags", className)}>
            {shown.map(tag => (
                <Link
                    key={tag}
                    to={`/Challenge?tag=${encodeURIComponent(tag)}`}
                    className="wb-challenges-tag"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onSelect) {
                            e.preventDefault();
                            onSelect(tag);
                        }
                    }}
                >
                    {tag}
                </Link>
            ))}
            {hidden > 0 && <span className="wb-challenges-tag-more" title={tags.slice(shown.length).join(", ")}>+{hidden}</span>}
        </div>
    );
};

export default ChallengeTags;
