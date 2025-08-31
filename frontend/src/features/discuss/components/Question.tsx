import DateUtils from '../../../utils/DateUtils';
import { Link, useNavigate } from "react-router-dom";
import { IPostAttachment } from "./PostAttachment";
import { WeblerBadge } from "../../../components/InputTags";
import React from "react";
import { MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import Author from "../../../components/Author";

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

const Question = React.forwardRef(({ question, searchQuery, showUserProfile }: QuestionProps, ref: React.ForwardedRef<HTMLDivElement>) => {

    const navigate = useNavigate();
    const regex = new RegExp(`(^|\\b)${searchQuery.trim()}`, "i");
    const match = question.title.match(regex);

    let title;
    if (searchQuery.trim().length > 0 && match && match.index !== undefined) {
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


    const handleClick = () => {
        navigate("/Discuss/" + question.id);
    }

    const date_format = showUserProfile ? DateUtils.format(new Date(question.date!)): 
        DateUtils.format2(new Date(question.date!));

    let body = (

        <div className="p-4 rounded-lg border bg-white dark:bg-gray-800 hover:shadow-md transition" onClick={handleClick}>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100" style={{ wordBreak: "break-word" }}>
                <Link to={"/Discuss/" + question.id}>
                    <h5 >{title}</h5>
                </Link>
            </h3>
            <div className="flex flex-wrap gap-2 my-2">
                {
                    question.tags.map((tag, idx) => {
                        return ( 
                        <WeblerBadge key={idx} name={tag} state="neutral" />
                        )
                    })
                }
            </div>
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">

            <Author image={question.userAvatar} 
                name={question.userName} 
                content={date_format} 
                role="" 
            />
            
            <div className="flex items-center gap-4">
                {
                    showUserProfile && (
                        <>
                        <span className="flex items-center gap-1 text-gray-500">
                        <ThumbsUp className="w-4 h-4" /> {question.votes}</span>
                        <span className="flex items-center gap-1 text-gray-500">
                        <ThumbsDown className="w-4 h-4" /> 0 </span>
                        <span className="flex items-center gap-1 text-gray-500">
                        <MessageCircle className="w-4 h-4" /> {question.answers} </span>
                        </>
                    )
                }

                {
                    !showUserProfile && (
                        <span className="flex items-center gap-1 ml-auto text-red-500 font-semibold">
                        ❤️ {question.votes}
                        </span>
                    )
                }
            </div>
        </div>
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