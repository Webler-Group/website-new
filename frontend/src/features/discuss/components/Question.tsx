import { FaComment } from "react-icons/fa6";
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";

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
        <div className="rounded border p-2 mb-2 bg-white">
            <div>
                <Link to={"/Discuss/" + question.id}>
                    <h3>{title}</h3>
                </Link>
                <div className="d-flex flex-wrap">
                    {
                        question.tags.map((tag, idx) => {
                            return (
                                <small key={idx} className={"rounded p-1 me-2 border" + (tag === searchQuery ? " bg-warning" : " bg-light")}>{tag}</small>
                            )
                        })
                    }
                </div>
            </div>
            <div className="d-flex justify-content-between align-items-end">
                <div>
                    <small>
                        <FaComment />
                        <span className="ms-2">{question.answers} Answers</span>
                    </small>
                </div>

                <div className="d-flex">
                    <div>
                        <div>
                            <small>{DateUtils.format(new Date(question.date))}</small>
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