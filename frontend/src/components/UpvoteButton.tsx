import { FaThumbsUp } from "react-icons/fa6";
import { cx } from "./ui";

interface UpvoteButtonProps {
    votes: number;
    isUpvoted: boolean;
    onVote: () => void;
    onShowVoters: () => void;
    size?: "sm" | "md";
    className?: string;
}

/**
 * Split pill: the thumb toggles the upvote, the count opens the list of upvoters.
 * Both halves are separate buttons with their own padded hit area.
 */
const UpvoteButton: React.FC<UpvoteButtonProps> = ({ votes, isUpvoted, onVote, onShowVoters, size = "md", className }) => {
    return (
        <div className={cx("wb-pill", size === "sm" && "wb-pill--sm", isUpvoted && "wb-upvote--active", className)}>
            <button
                type="button"
                className="wb-pill-part wb-upvote-toggle"
                onClick={onVote}
                aria-pressed={isUpvoted}
                title={isUpvoted ? "Remove upvote" : "Upvote"}
            >
                <FaThumbsUp />
            </button>
            <button
                type="button"
                className="wb-pill-part wb-pill-count wb-upvote-count"
                onClick={onShowVoters}
                disabled={votes <= 0}
                title={votes > 0 ? "Show upvoters" : undefined}
            >
                {votes}
            </button>
        </div>
    );
};

export default UpvoteButton;
