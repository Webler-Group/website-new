import { FaPencil } from "react-icons/fa6";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import { FaCheckCircle } from "react-icons/fa";

interface IAnswer {
    id: string;
    userName: string;
    userId: string;
    date: string;
    message: string;
    isAccepted: boolean;
    parentId: string;
}

interface AnswerProps {
    answer: IAnswer;
    acceptedAnswer: string | null;
    toggleAcceptedAnswer: (postId: string) => void;
    isQuestionOwner: boolean;
    isOwner: boolean;
    showEditAnswer: (postId: string) => void;
}

const Answer = ({ answer, acceptedAnswer, toggleAcceptedAnswer, isQuestionOwner, isOwner, showEditAnswer }: AnswerProps) => {

    let isAccepted = acceptedAnswer === answer.id;

    return (
        <div className={"rounded border p-2 mb-2 bg-white position-relative" + (isAccepted ? " border-success border-2" : "")}>
            {
                isOwner &&
                <span className="wb-discuss-reply__edit-button" onClick={() => showEditAnswer(answer.id)}>
                    <FaPencil />
                </span>
            }
            <div className="d-flex">
                <div>
                    {
                        isQuestionOwner &&
                        <button onClick={() => toggleAcceptedAnswer(answer.id)} className="bg-transparent border-0 h3">
                            <span className={isAccepted ? "text-success" : "text-secondary"}>
                                <FaCheckCircle />
                            </span>
                        </button>
                    }
                </div>
                <p className="wb-discuss-question__description mt-2 ms-4">{answer.message}</p>
            </div>
            <div className="d-flex justify-content-end align-items-end">
                <div className="d-flex">
                    <div>
                        <div>
                            <small>{DateUtils.format(new Date(answer.date))}</small>
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
}

export type {
    IAnswer
}

export default Answer