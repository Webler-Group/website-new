import { FaPencil } from "react-icons/fa6";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import { FaCheckCircle, FaThumbsUp } from "react-icons/fa";
import { useState } from "react";
import {useApi} from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";
import React from "react";
import PostAttachment, { IPostAttachment } from "./PostAttachment";

interface IAnswer {
    id: string;
    userName: string;
    userId: string;
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
        <div className={"rounded border p-2 mb-2 position-relative" + borderClassName} style={{ background: bg }}>
            {
                isOwner &&
                <span className="wb-discuss-reply__edit-button" onClick={() => showEditAnswer(answer.id)}>
                    <FaPencil />
                </span>
            }
            <div className="d-flex">
                <div className="wb-discuss-reply__actions">
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
                <div className="wb-discuss-question__main ms-2">
                    <p className="wb-discuss-question__description mt-2">{answer.message}</p>
                    <div className="mt-3">
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
            <div className="d-flex justify-content-end align-items-end mt-3">
                <div className="d-flex">
                    <div>
                        <div>
                            <small className="text-secondary">{DateUtils.format(new Date(answer.date))}</small>
                        </div>
                        <div className="d-flex justify-content-end">
                            <ProfileName userId={answer.userId} userName={answer.userName} />
                        </div>
                    </div>
                    <div className="ms-2 wb-p-follow-item__avatar">
                        <img className="wb-p-follow-item__avatar-image" src="/resources/images/user.svg" />
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