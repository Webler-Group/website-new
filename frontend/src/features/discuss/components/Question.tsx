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
                <Link to={"/Discuss/" + question.id}>
                    <b className="text-dark d-block text-truncate" style={{ fontSize: isCompact ? "0.95rem" : "1.02rem", wordBreak: "break-word" }}>{title}</b>
                </Link>
                
                {!isCompact && (
                    <div className="d-flex flex-wrap mt-2">
                        {
                            question.tags.map((tag, idx) => {
                                return (
                                    <WeblerBadge key={idx} name={tag} state="neutral" className="me-2" />
                                )
                            })
                        }
                    </div>
                )}

                <div className={`d-flex small gap-3 text-secondary ${isCompact ? "mt-1" : "mt-2"}`}>
                    <div className="d-flex align-items-center gap-1 opacity-75">
                        <FaThumbsUp size={isCompact ? 10 : 12} />
                        <span style={{ fontSize: isCompact ? "0.75rem" : "0.85rem" }}>{question.votes}</span>
                    </div>
                    <div className="d-flex align-items-center gap-1 opacity-75">
                        <FaComment size={isCompact ? 10 : 12} />
                        <span style={{ fontSize: isCompact ? "0.75rem" : "0.85rem" }}>{question.answers}</span>
                    </div>
                    {
                        showUserProfile === false &&
                        <div>
                            <span style={{ fontSize: "0.75rem" }}>{DateUtils.format2(new Date(question.date!))}</span>
                        </div>
                    }
                </div>
            </div>
            {
                showUserProfile && isUser(question.user) &&
                <div className="wb-question-user-meta d-flex justify-content-end align-items-center mt-2">
                    <div className="text-end">
                        <div className="wb-question-date">
                            <small className="text-secondary">{DateUtils.format(new Date(question.date))}</small>
                        </div>
                        <div className="d-flex justify-content-end">
                            <ProfileName userId={question.user.id} userName={question.user.name} />
                        </div>
                    </div>
                    <div className="ms-2 flex-shrink-0">
                        <ProfileAvatar size={32} avatarUrl={question.user.avatarUrl} />
                    </div>
                </div>
            }
        </div>
    );

    const content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content;
});

export default Question;