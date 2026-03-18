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
            {showUserProfile && isUser(question.user) && (
                <div className="flex-shrink-0 me-2">
                    <ProfileAvatar size={isCompact ? 28 : 32} avatarUrl={question.user.avatarUrl} />
                </div>
            )}
            <div className="flex-grow-1 min-width-0">
                <Link to={"/Discuss/" + question.id} className="d-block text-truncate text-dark" style={{ fontSize: isCompact ? "0.95rem" : "1.02rem" }}>
                    <b>{title}</b>
                </Link>

                {!isCompact && (
                    <div className="d-flex flex-wrap mt-1">
                        {question.tags.map((tag, idx) => (
                            <WeblerBadge key={idx} name={tag} state="neutral" className="me-2" />
                        ))}
                    </div>
                )}

                <div className={`d-flex align-items-center gap-2 small text-secondary ${isCompact ? "mt-1" : "mt-2"}`}>
                    <div className="d-flex align-items-center gap-2 flex-wrap" style={{ flex: "1 1 0", minWidth: 0 }}>
                        {showUserProfile && isUser(question.user) && (
                            <ProfileName userId={question.user.id} userName={question.user.name} />
                        )}
                        <div className="d-flex align-items-center gap-1 opacity-75">
                            <FaThumbsUp size={isCompact ? 10 : 12} />
                            <span style={{ fontSize: isCompact ? "0.75rem" : "0.85rem" }}>{question.votes}</span>
                        </div>
                        <div className="d-flex align-items-center gap-1 opacity-75">
                            <FaComment size={isCompact ? 10 : 12} />
                            <span style={{ fontSize: isCompact ? "0.75rem" : "0.85rem" }}>{question.answers}</span>
                        </div>
                    </div>
                    <span className="text-muted flex-shrink-0 wb-question-date">
                        {DateUtils.format(new Date(question.date))}
                    </span>
                </div>
            </div>
        </div>
    );

    const content = ref ?
        <div ref={ref} className="min-width-0 overflow-hidden">{body}</div>
        :
        <div className="min-width-0 overflow-hidden">{body}</div>
    return content;
});

export default Question;