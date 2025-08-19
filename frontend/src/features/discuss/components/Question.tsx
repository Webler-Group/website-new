import { FaComment } from "react-icons/fa6";
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa";
import { IPostAttachment } from "./PostAttachment";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { WeblerBadge } from "../../../components/InputTags";

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
}

const Question = ({ question, searchQuery }: QuestionProps) => {

    const regex = new RegExp(`(^|\\b)${searchQuery.trim()}`, "i");
    const match = question.title.match(regex);

    let title;
    if (searchQuery.trim().length > 2 && match && match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;

        title = (
            <>
                {question.title.slice(0, start)}
                <span className="bg-warning">{question.title.slice(start, end)}</span>
                {question.title.slice(end)}
            </>
        );
    } else {
        title = <>{question.title}</>;
    }

    return (
        <div className="rounded border p-2 mb-2 bg-white d-md-flex">
            <div className="flex-grow-1">
                <Link to={"/Discuss/" + question.id}>
                    <h4 style={{ wordBreak: "break-word" }}>{title}</h4>
                </Link>
                <div className="d-flex flex-wrap mt-3">
                    {
                        question.tags.map((tag, idx) => {
                            return (
                                <WeblerBadge key={idx} name={tag} state="neutral" className={"me-2 " + (tag === searchQuery.toLowerCase() ? " bg-warning" : " bg-light")} />
                            )
                        })
                    }
                </div>
                <div className="d-flex small mt-3">
                    <div className="me-3 d-flex align-items-center">
                        <FaThumbsUp />
                        <span className="ms-2">{question.votes} Votes</span>
                    </div>
                    <div className="d-flex align-items-center">
                        <FaComment />
                        <span className="ms-2">{question.answers} Answers</span>
                    </div>
                </div>
            </div>
            <div className="d-flex justify-content-end align-items-end mt-3">
                <div className="d-flex align-items-center">
                    <div>
                        <div>
                            <small className="text-secondary">{DateUtils.format(new Date(question.date))}</small>
                        </div>
                        <div className="d-flex justify-content-end">
                            <ProfileName userId={question.userId} userName={question.userName} />
                        </div>
                    </div>
                    <div className="ms-2 wb-p-follow-item__avatar">
                        <ProfileAvatar size={32} avatarImage={question.userAvatar} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export type { IQuestion }

export default Question