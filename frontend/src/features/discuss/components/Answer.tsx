import { FaPencil } from "react-icons/fa6";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import { FaCheckCircle, FaThumbsUp } from "react-icons/fa";
import { useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";
import React from "react";
import PostAttachment from "../../../components/post-attachment-select/PostAttachment";
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { AnswerDetails, VotePostData } from "../types";

interface AnswerProps {
    answer: AnswerDetails;
    acceptedAnswer: string | null;
    toggleAcceptedAnswer: (postId: string) => void;
    isQuestionOwner: boolean;
    showEditAnswer: (postId: string) => void;
    newlyCreatedAnswer: string | null;
    onShowVoters: (id: string) => void;
}

const Answer = React.forwardRef(({ answer, acceptedAnswer, toggleAcceptedAnswer, isQuestionOwner, showEditAnswer, newlyCreatedAnswer, onShowVoters }: AnswerProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const [upvoted, setUpvoted] = useState(answer.isUpvoted);
    const [votes, setVotes] = useState(answer.votes);
    const isOwner = userInfo?.id === answer.user.id;
    const navigate = useNavigate();

    const voteAnswer = async () => {
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        const vote = upvoted ? 0 : 1;
        const result = await sendJsonRequest<VotePostData>("/Discussion/VotePost", "POST", { postId: answer.id, vote });
        if (result.data && result.data.vote === vote) {
            setUpvoted(vote === 1);
            setVotes(votes + (vote ? 1 : -1));
        }
    }

    const showVoters = () => {
        onShowVoters(answer.id);
    }

    let isAccepted = acceptedAnswer === answer.id;
    let isNewlyCreated = newlyCreatedAnswer === answer.id;
    let bg = isNewlyCreated ? "beige" : "white";

    let body = (
        <div className="gap-3 d-flex flex-column border-bottom border-2 py-3" style={{ background: bg }}>
            <div className="d-flex gap-3 align-items-start">
                <div className="d-flex flex-column align-items-center flex-shrink-0" style={{ width: '40px' }}>
                    {
                        (isQuestionOwner || isAccepted) &&
                        <div onClick={() => toggleAcceptedAnswer(answer.id)} className={"wb-discuss-reply__actions__best-answer-button mb-2" + (isAccepted ? " text-success" : " text-secondary")} style={{ cursor: isQuestionOwner ? "pointer" : "default" }}>
                            <FaCheckCircle />
                        </div>
                    }
                    <div className="wb-discuss-voting d-flex align-items-center">
                        <span onClick={voteAnswer} className={"wb-icon-button p-0" + (upvoted ? " text-black" : "")}>
                            <FaThumbsUp />
                        </span>
                        <b className="wb-icon-button text-black ms-1" onClick={showVoters}>{votes}</b>
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
                    <div className="mt-1">
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
                            <ProfileName userId={answer.user.id} userName={answer.user.name} />
                        </div>
                    </div>
                    <div className="ms-2">
                        <ProfileAvatar size={32} avatarUrl={answer.user.avatarUrl} />
                    </div>
                </div>
            </div>
        </div>
    )

    let content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>

    return content;
});

export default Answer;