import { FaComment } from "react-icons/fa6";
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa";
import { IPostAttachment } from "./PostAttachment";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { WeblerBadge } from "../../../components/InputTags";
import React from "react";

interface IQuestion {
    id: string;
    title: string;
    tags: string[];
    userName: string;
    userAvatar: string;
    userId: string;
    date: string;
    message: string;
    answers: number;
    votes: number;
    isUpvoted: boolean;
    isFollowed: boolean;
    attachments: IPostAttachment[];
}

interface QuestionProps {
    question: IQuestion;
    searchQuery: string;
    showUserProfile: boolean;
}

const Question = React.forwardRef(({ question, showUserProfile }: QuestionProps, ref: React.ForwardedRef<HTMLDivElement>) => {

    let title = question.title;

    let body = (
        <div className="py-2 border-bottom mb-2 bg-white d-md-flex">
            <div className="flex-grow-1">
                <Link to={"/Discuss/" + question.id}>
                    <b style={{ wordBreak: "break-word" }}>{title}</b>
                </Link>
                <div className="d-flex flex-wrap mt-2">
                    {
                        question.tags.map((tag, idx) => {
                            return (
                                <WeblerBadge key={idx} name={tag} state="neutral" className="me-2" />
                            )
                        })
                    }
                </div>
                <div className="d-flex small mt-2 gap-3">
                    <div className="d-flex align-items-center">
                        <FaThumbsUp />
                        <span className="ms-1">{question.votes}</span>
                    </div>
                    <div className="d-flex align-items-center">
                        <FaComment />
                        <span className="ms-1">{question.answers}</span>
                    </div>
                    {
                        showUserProfile === false &&
                        <div>
                            <span className="text-secondary">{DateUtils.format2(new Date(question.date!))}</span>
                        </div>
                    }
                </div>
            </div>
            {
                showUserProfile &&
                <div className="d-flex justify-content-end align-items-end mt-2">
                    <div className="d-flex align-items-center">
                        <div>
                            <div>
                                <small className="text-secondary">{DateUtils.format(new Date(question.date))}</small>
                            </div>
                            <div className="d-flex justify-content-end">
                                <ProfileName userId={question.userId} userName={question.userName} />
                            </div>
                        </div>
                        <div className="ms-2">
                            <ProfileAvatar size={32} avatarImage={question.userAvatar} />
                        </div>
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

export type { IQuestion }

export default Question