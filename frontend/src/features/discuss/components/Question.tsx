import { FaComment } from "react-icons/fa6";
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa";

interface IQuestion {
    id: string;
    title: string;
    tags: string[];
    userName: string;
    userId: string;
    date: string;
    message: string;
    answers: number;
    votes: number;
    isUpvoted: boolean;
    isFollowed: boolean;
}

interface QuestionProps {
    question: IQuestion;
    searchQuery: string;
}

const Question = ({ question, searchQuery }: QuestionProps) => {

    let titleMatch = question.title.match(new RegExp("^" + searchQuery, "i"));
    let title = titleMatch && titleMatch.length ?
        <>
            <span className="bg-warning">{titleMatch[0]}</span>
            {question.title.slice(titleMatch[0].length)}
        </>
        :
        <>
            {question.title}
        </>

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
                                <small key={idx} className={"rounded px-2 me-2 mb-1 border" + (tag === searchQuery.toLowerCase() ? " bg-warning" : " bg-light")}>{tag}</small>
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
                <div className="d-flex">
                    <div>
                        <div>
                            <small className="text-secondary">{DateUtils.format(new Date(question.date))}</small>
                        </div>
                        <div className="d-flex justify-content-end">
                            <ProfileName userId={question.userId} userName={question.userName} />
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

export type { IQuestion }

export default Question