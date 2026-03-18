import { FaComment } from "react-icons/fa6";
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";
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

    let body = (
        <div className={`wb-question-item border-bottom bg-white d-flex ${isCompact ? "p-2 compact" : "py-2"}`}>
            <div className="flex-grow-1 min-width-0">
                <Link to={"/Discuss/" + question.id} className="d-block text-truncate text-dark" style={{ fontSize: isCompact ? "0.95rem" : "1.02rem" }}>
                    <b>{title}</b>
                </Link>

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
                        <span className="wb-question-date ms-1">{DateUtils.format(new Date(question.date))}</span>
                    )}
                </div>
            </div>

            {/* Right: date + name + avatar */}
            {showUserProfile && isUser(question.user) && (
                <div className="flex-shrink-0 ms-2 d-flex flex-column align-items-end justify-content-between wb-question-user-meta">
                    <small className="text-muted wb-question-date">{DateUtils.format(new Date(question.date))}</small>
                    <div className="d-flex align-items-center gap-1 mt-1">
                        <ProfileName userId={question.user.id} userName={question.user.name} />
                        <ProfileAvatar size={isCompact ? 24 : 28} avatarUrl={question.user.avatarUrl} />
                    </div>
                </div>
            )}
        </div>
    );

    const content = ref ?
        <div ref={ref} className="min-width-0 overflow-hidden">{body}</div>
        :
        <div className="min-width-0 overflow-hidden">{body}</div>
    return content;
});

export default Question;
