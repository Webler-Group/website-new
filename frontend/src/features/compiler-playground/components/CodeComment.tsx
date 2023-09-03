import { useEffect, useState } from "react";
import { FaPencil, FaThumbsUp, FaTrash } from "react-icons/fa6";
import DateUtils from "../../../utils/DateUtils";
import ProfileName from "../../../components/ProfileName";
import ApiCommunication from "../../../helpers/apiCommunication";
import { ICode } from "../../codes/components/Code";
import { Button } from "react-bootstrap";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";

interface ICodeComment {
    id: string;
    userId: string;
    userName: string;
    date: string;
    message: string;
    answers: number;
    votes: number;
    isUpvoted: boolean;
}

interface CodeCommentProps {
    code: ICode;
    parentId: string | null;
    data: ICodeComment;
    onReply: (id: string, parentId: string, callback: (data: ICodeComment) => void) => void;
    addReplyToParent: (data: ICodeComment) => void;
    editParentReply: (id: string, message: string) => void;
    activeComment: string | null;
    onEdit: (id: string, parentId: string | null, message: string, callback: (id: string, message: string) => void) => void;
    onDelete: (id: string, parentId: string | null, callback: (id: string) => void) => void;
    deleteReplyFromParent: (id: string) => void;
    onVote: (id: string, vote: number) => void;
}

const CodeComment = ({ code, data, parentId, onReply, addReplyToParent, activeComment, onEdit, editParentReply, onDelete, deleteReplyFromParent, onVote }: CodeCommentProps) => {

    const { userInfo } = useAuth();
    const [repliesVisible, setRepliesVisible] = useState(false);
    const [replies, setReplies] = useState<ICodeComment[]>([]);
    const [replyCount, setReplyCount] = useState(data.answers);
    const repliesPerPage = 20;
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const navigate = useNavigate();

    const nextPage = () => {
        getReplies();
    }

    const addReply = (data: ICodeComment) => {
        if (parentId) {
            addReplyToParent(data);
        }
        else {
            setRepliesVisible(true);
            setReplies(replies => [data, ...replies]);
            setReplyCount(replyCount => replyCount + 1);
        }
    }

    const deleteReply = (id: string) => {
        if (parentId) {
            deleteReplyFromParent(id);
        }
        else {
            setReplies(replies => replies.filter(x => x.id !== id));
            setReplyCount(replyCount => replyCount - 1);
        }
    }

    const editReply = (id: string, message: string) => {
        setReplies(answers => {
            const currentAnswers = [...answers];
            for (let i = 0; i < currentAnswers.length; ++i) {
                if (currentAnswers[i].id === id) {
                    currentAnswers[i].message = message;
                }
            }
            return currentAnswers;
        });
    }

    useEffect(() => {
        if (repliesVisible && replies.length === 0) {
            getReplies();
        }
    }, [repliesVisible]);

    const getReplies = async () => {
        const result = await ApiCommunication.sendJsonRequest(`/Discussion/GetCodeComments`, "POST", {
            codeId: code.id,
            parentId: data.id,
            page: Math.ceil(replies.length / repliesPerPage) + 1,
            filter: 2,
            count: repliesPerPage
        });
        if (result && result.posts) {
            if (result.posts.length < repliesPerPage) {
                setCommentsLoaded(true);
            }

            setReplies(replies => [...replies, ...result.posts]);
        }
    }

    const handleReply = () => {
        if (!userInfo) {
            navigate("/Login");
            return;
        }
        onReply(data.id, parentId ? parentId : data.id, addReply)
    }

    const handleEdit = () => {
        if (!userInfo) {
            navigate("/Login");
            return;
        }
        onEdit(data.id, parentId, data.message, editParentReply);
    }

    const handleDelete = () => {
        if (!userInfo) {
            navigate("/Login");
            return;
        }
        onDelete(data.id, parentId, deleteReply);
    }

    const voteAnswer = async () => {
        if (!userInfo) {
            navigate("/Login");
            return;
        }
        const vote = data.isUpvoted ? 0 : 1;
        const result = await ApiCommunication.sendJsonRequest("/Discussion/VotePost", "POST", { postId: data.id, vote });
        if (result.vote === vote) {
            onVote(data.id, vote);
        }
    }

    const onReplyVote = (id: string, vote: number) => {
        setReplies(answers => {
            const currentAnswers = [...answers];
            for (let i = 0; i < currentAnswers.length; ++i) {
                if (currentAnswers[i].id === id) {
                    currentAnswers[i].isUpvoted = vote === 1;
                    currentAnswers[i].votes += vote ? 1 : -1;
                }
            }
            return currentAnswers;
        });
    }

    return (
        <div className="mb-3">
            <div className="d-flex position-relative">
                <div className="wb-user-comment__options">
                    <div className="d-flex gap-2">
                        {
                            userInfo &&
                            <>
                                <span onClick={handleEdit}>
                                    <FaPencil />
                                </span>
                                <span onClick={handleDelete}>
                                    <FaTrash />
                                </span>
                            </>
                        }
                    </div>
                </div>
                <div>
                    <div className="ms-2 wb-p-follow-item__avatar">
                        <img className="wb-p-follow-item__avatar-image" src="/resources/images/user.svg" />
                    </div>
                </div>
                <div className="flex-grow-1">
                    <div className={"rounded border p-2 mb-1 bg-light" + (activeComment === data.id ? " border-info border-2" : "")}>
                        <div>
                            <ProfileName userId={data.userId} userName={data.userName} />
                        </div>
                        <p className="wb-discuss-question__description mt-2">{data.message}</p>
                    </div>
                    <div className="d-flex justify-content-between">
                        <div className="d-flex gap-2">
                            <div>
                                <span onClick={voteAnswer} className={"wb-discuss-voting__button" + (data.isUpvoted ? " text-black" : "")}>
                                    <FaThumbsUp />
                                </span>
                                <span className="ms-1">{data.votes}</span>
                            </div>
                            <span onClick={handleReply} className="wb-user-comment-footer__reply">
                                Reply
                            </span>
                            {
                                (parentId === null && replyCount > 0) &&
                                <>
                                    <span className="wb-user-comment-footer__replies" onClick={() => setRepliesVisible(!repliesVisible)}>
                                        {replyCount} replies
                                    </span>
                                </>
                            }
                        </div>
                        <div>
                            <div>
                                <small className="text-secondary">{DateUtils.format(new Date(data.date))}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {
                parentId === null &&
                <div className="wb-user-comment__thread" hidden={repliesVisible === false}>
                    <div>
                        {
                            replies.map((item, idx) => {
                                return (
                                    <CodeComment key={idx} data={item} parentId={data.id} onReply={onReply} code={code} addReplyToParent={addReply} activeComment={activeComment} onEdit={onEdit} editParentReply={editReply} onDelete={onDelete} deleteReplyFromParent={deleteReply} onVote={onReplyVote} />
                                )
                            })
                        }
                        {
                            commentsLoaded === false &&
                            <div>
                                <Button onClick={nextPage} variant="link">Load more</Button>
                            </div>
                        }
                    </div>
                </div>
            }
        </div>
    )
}

export type {
    ICodeComment
}

export default CodeComment;