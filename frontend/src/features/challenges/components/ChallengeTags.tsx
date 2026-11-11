import { Link } from "react-router-dom";

interface ChallengeTagsProps {
    tags?: string[];
    className?: string;
    onSelect?: (tag: string) => void;
}

const ChallengeTags = ({ tags, className, onSelect }: ChallengeTagsProps) => {
    if (!tags || tags.length === 0) return null;

    return (
        <div className={"wb-challenge-tags " + (className ?? "")}>
            {tags.map(tag => (
                <Link
                    key={tag}
                    to={`/Challenge?tag=${encodeURIComponent(tag)}`}
                    className="wb-challenge-tag"
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
        </div>
    );
};

export default ChallengeTags;
