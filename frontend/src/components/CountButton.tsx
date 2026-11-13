import { ReactNode } from "react";
import { cx } from "./ui";

interface CountButtonProps {
    icon: ReactNode;
    count: number;
    onClick: () => void;
    title?: string;
    size?: "sm" | "md";
    className?: string;
}

/** Single pill button with an icon and a count, styled to match UpvoteButton */
const CountButton: React.FC<CountButtonProps> = ({ icon, count, onClick, title, size = "md", className }) => {
    return (
        <button
            type="button"
            className={cx("wb-pill wb-pill-part", size === "sm" && "wb-pill--sm", className)}
            onClick={onClick}
            title={title}
        >
            {icon}
            <span className="wb-pill-count">{count}</span>
        </button>
    );
};

export default CountButton;
