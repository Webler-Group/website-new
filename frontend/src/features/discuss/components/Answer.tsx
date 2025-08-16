import { FaPencil } from "react-icons/fa6";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import { FaCheckCircle, FaThumbsUp } from "react-icons/fa";
import { useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";
import React from "react";
import PostAttachment, { IPostAttachment } from "./PostAttachment";
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from "../../../components/MarkdownRenderer";

interface IAnswer {
    id: string;
    userName: string;
    userId: string;
    userAvatar: string;
    date: string;
    message: string;
    isAccepted: boolean;
    parentId: string;
    votes: number;
    isUpvoted: boolean;
    attachments: IPostAttachment[];
}

interface AnswerProps {
    answer: IAnswer;
    acceptedAnswer: string | null;
    toggleAcceptedAnswer: (postId: string) => void;
    isQuestionOwner: boolean;
    showEditAnswer: (postId: string) => void;
    newlyCreatedAnswer: string | null;
}

const Answer = React.forwardRef(({ answer, acceptedAnswer, toggleAcceptedAnswer, isQuestionOwner, showEditAnswer, newlyCreatedAnswer }: AnswerProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const [upvoted, setUpvoted] = useState(answer.isUpvoted);
    const [votes, setVotes] = useState(answer.votes);
    const isOwner = userInfo?.id === answer.userId;
    const navigate = useNavigate();

    const voteAnswer = async () => {
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        const vote = upvoted ? 0 : 1;
        const result = await sendJsonRequest("/Discussion/VotePost", "POST", { postId: answer.id, vote });
        if (result.vote === vote) {
            setUpvoted(vote === 1);
            setVotes(votes + (vote ? 1 : -1));
        }
    }

    let isAccepted = acceptedAnswer === answer.id;
    let isNewlyCreated = newlyCreatedAnswer === answer.id;
    let borderClassName = isAccepted ? " border-2 border-success" : "";
    let bg = isNewlyCreated ? "beige" : "white";

    let body = (
        <div className={"rounded border p-2 gap-2 d-flex flex-column mt-3 " + borderClassName} style={{ background: bg }}>
            <div className="d-flex gap-2">
                <div className="d-flex flex-column align-items-center">
                    {
                        (isQuestionOwner || isAccepted) &&
                        <div onClick={() => toggleAcceptedAnswer(answer.id)} className={"wb-discuss-reply__actions__best-answer-button" + (isAccepted ? " text-success" : " text-secondary")} style={{ cursor: isQuestionOwner ? "pointer" : "default" }}>
                            <FaCheckCircle />
                        </div>
                    }
                    <div className="wb-discuss-voting mt-2">
                        <span onClick={voteAnswer} className={"wb-discuss-voting__button" + (upvoted ? " text-black" : "")}>
                            <FaThumbsUp />
                        </span>
                        <b>{votes}</b>
                    </div>
                </div>

                <div className="flex-grow-1 d-flex flex-column gap-2" style={{ minWidth: 0 }}>
                    <div className="d-flex justify-content-end align-items-center">
                        {
                            isOwner &&
                            <span style={{ cursor: "pointer" }} onClick={() => showEditAnswer(answer.id)}>
                                <FaPencil />
                            </span>
                        }
                    </div>
                    <div className="wb-discuss-question__description">
                        <MarkdownRenderer content={answer.message} />
                    </div>
                    <div className="mt-2">
                        {
                            answer.attachments.map(attachment => {
                                return (
                                    <div key={attachment.id} className="mt-1">
                                        <PostAttachment data={attachment} />
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            </div>

            <div className="d-flex justify-content-end align-items-end mt-1">
                <div className="d-flex align-items-center">
                    <div>
                        <div>
                            <small className="text-secondary">{DateUtils.format(new Date(answer.date))}</small>
                        </div>
                        <div className="d-flex justify-content-end">
                            <ProfileName userId={answer.userId} userName={answer.userName} />
                        </div>
                    </div>
                    <div className="ms-2 wb-p-follow-item__avatar">
                        <ProfileAvatar size={32} avatarImage={answer.userAvatar} />
                    </div>
                </div>
            </div>
        </div>
    )

    let content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>

    return content
})

export type {
    IAnswer
}

export default Answer