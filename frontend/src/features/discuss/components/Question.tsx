import { cx } from "../../../components/ui";
import { FaComment } from "react-icons/fa6";
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { useNavigate } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { WeblerBadge } from "../../../components/InputTags";
import React from "react";
import { QuestionMinimal } from "../types";
import { isUser, UserMinimal } from "../../profile/types";

import "./Question.css";

interface QuestionProps {
    question: QuestionMinimal<UserMinimal | string>;
    searchQuery: string;
    showUserProfile: boolean;
    variant?: "default" | "compact";
}

const Question = React.forwardRef(({ question, showUserProfile, variant = "default" }: QuestionProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const isCompact = variant === "compact";
    let title = question.title;
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("a")) {
            return;
        }
        
        navigate("/Discuss/" + question.id);
    }

    return (
        <div ref={ref ?? undefined} className="wb-util-min-w-0 overflow-hidden">
            <div className={cx("wb-discuss-question-item border-bottom bg-body d-flex p-2", isCompact && "wb-discuss-question-item--compact")} onClick={handleClick}>
                <div className="flex-grow-1 wb-util-min-w-0">
                    <h3 className="wb-discuss-question-title text-truncate text-body-emphasis">{title}</h3>

                    {!isCompact && question.tags.length > 0 && (
                        <div className="d-flex flex-wrap mt-1">
                            {question.tags.map((tag, idx) => (
                                <WeblerBadge key={idx} name={tag} state="neutral" className="me-2" />
                            ))}
                        </div>
                    )}

                    <div className={`d-flex align-items-center gap-2 small text-secondary opacity-75 ${isCompact ? "mt-1" : "mt-2"}`}>
                        <div className="d-flex align-items-center gap-1">
                            <FaThumbsUp size={isCompact ? 10 : 12} />
                            <span>{question.votes}</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <FaComment size={isCompact ? 10 : 12} />
                            <span>{question.answers}</span>
                        </div>
                        {!showUserProfile && (
                            <span className="wb-discuss-question-date ms-1">{DateUtils.format(new Date(question.date))}</span>
                        )}
                    </div>
                </div>

                {/* Right: date + name + avatar */}
                {showUserProfile && isUser(question.user) && (
                    <div className="flex-shrink-0 ms-2 d-flex flex-column align-items-end justify-content-between wb-discuss-question-user-meta">
                        <small className="text-muted wb-discuss-question-date">{DateUtils.format(new Date(question.date))}</small>
                        <div className="d-flex align-items-center gap-1 mt-1">
                            <ProfileName userId={question.user.id} userName={question.user.name} />
                            <ProfileAvatar size={isCompact ? 24 : 28} avatarUrl={question.user.avatarUrl} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default Question;
