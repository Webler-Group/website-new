import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/context/authContext';
import { FaPencil, FaThumbsUp, FaTrash } from 'react-icons/fa6';
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Button } from 'react-bootstrap';
import useComments from '../hooks/useComments';
import { ICode } from '../../codes/components/Code';
import { useNavigate } from 'react-router-dom';
import ApiCommunication from '../../../helpers/apiCommunication';

interface ICodeComment {
    id: string;
    userId: string;
    userName: string;
    date: string;
    message: string;
    answers: number;
    votes: number;
    isUpvoted: boolean;
    index: number;
}

interface CommentNodeProps {
    data: ICodeComment | null;
    code: ICode;
    parentId: string | null;
    filter: number;
    onReply: (parentId: string, callback: (data: ICodeComment) => void) => void;
    onEdit: (id: string, message: string, callback: (id: string, message: string) => void) => void;
    onDelete: (id: string, callback: (id: string, answers: number) => void, answers: number) => void;
    onVote: (id: string, vote: number) => void;
    setDefaultOnReplyCallback: (callback: (data: ICodeComment) => void) => void;
    addReplyToParent: (data: ICodeComment) => void;
    editParentReply: (id: string, message: string) => void;
    deleteParentReply: (id: string, answers: number) => void;
    activePostId: string | null;
    setActivePostId: (callback: (data: string | null) => string | null) => void;
    showAllComments: boolean;
    setShowAllComments: (callback: (data: boolean) => boolean) => void;
    isActivePostReply: boolean;
    defaultReplies: ICodeComment[] | null;
}

const CommentNode = React.forwardRef(({
    code,
    data, parentId,
    filter,
    onReply,
    onEdit,
    onDelete,
    onVote,
    setDefaultOnReplyCallback,
    addReplyToParent,
    editParentReply,
    deleteParentReply,
    activePostId,
    setActivePostId,
    showAllComments,
    setShowAllComments,
    isActivePostReply,
    defaultReplies
}: CommentNodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { userInfo } = useAuth();
    const navigate = useNavigate()

    const [replyCount, setReplyCount] = useState(data ? data.answers : 0);
    const [repliesVisible, setRepliesVisible] = useState(data === null || defaultReplies !== null);

    let initialIndicesState = (defaultReplies && defaultReplies.length > 0) ?
        { firstIndex: defaultReplies[0].index, lastIndex: defaultReplies[defaultReplies.length - 1].index, _state: 0 }
        :
        { firstIndex: 0, lastIndex: 0, _state: 0 }
    const [indices, setIndices] = useState(initialIndicesState);
    const [findPostId, setFindPostId] = useState(activePostId);
    const {
        isLoading,
        error,
        results,
        hasNextPage,
        add,
        set,
        remove
    } = useComments(code.id!, data ? data.id : null, 20, indices, filter, repliesVisible, findPostId, defaultReplies);
    const activePostRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (data === null) {
            setDefaultOnReplyCallback(() => addReply);
        }
    }, [])

    useEffect(() => {
        if (repliesVisible) {
            if (indices._state !== 0) {
                setActivePostId(() => null)
                setFindPostId(null)
            }
            else if (data) {
                setFindPostId(null)
            }
            if (defaultReplies === null) {
                setIndices(() => ({ firstIndex: 0, lastIndex: 0, _state: 1 }))
            }
        }
    }, [code, filter, repliesVisible])

    useEffect(() => {
        if (showAllComments) {
            if (activePostId === null) {
                setFindPostId(null)
            }
            setIndices(() => ({ firstIndex: 0, lastIndex: 0, _state: 1 }))
        }
    }, [showAllComments])

    const intObserver = useRef<IntersectionObserver>()
    const lastCommentRef = useCallback((comment: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(comments => {

            if (comments[0].isIntersecting && hasNextPage) {
                setFindPostId(null)
                setIndices(indices => ({ ...indices, lastIndex: results[results.length - 1].index + 1, _state: 1 }));
            }
        })


        if (comment) intObserver.current.observe(comment)
    }, [isLoading, hasNextPage])

    const toggleReplies = () => {
        setRepliesVisible(visible => !visible);
    }

    const handleLoadPrev = () => {
        if (isLoading) return
        setFindPostId(null)
        setIndices(indices => ({ ...indices, firstIndex: results[0].index, _state: 2 }))
    }

    const handleReply = () => {
        if (!data) {
            return
        }
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        setRepliesVisible(true);
        onReply(parentId ? parentId : data.id, parentId ? addReplyToParent : addReply);
    }

    const handleEdit = () => {
        if (data === null) {
            return;
        }
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        onEdit(data.id, data.message, editParentReply);
    }

    const handleDelete = () => {
        if (data === null) {
            return;
        }
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        onDelete(data.id, deleteParentReply, replyCount);
    }

    const handleVote = async () => {
        if (data === null) {
            return;
        }
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        const vote = data.isUpvoted ? 0 : 1;
        const result = await ApiCommunication.sendJsonRequest("/Discussion/VotePost", "POST", { postId: data.id, vote });
        if (result.vote === vote) {
            onVote(data.id, vote);
        }
    }

    const addReply = (data: ICodeComment) => {
        add(data)
        setReplyCount(count => count + 1)
    }

    const editReply = (id: string, message: string) => {
        set(id, data => ({ ...data, message }));
    }

    const deleteReply = (id: string, answers: number) => {
        remove(id)
        setReplyCount(count => count - 1 - answers)
        setShowAllComments(() => true);
        setActivePostId(() => null);
    }

    const voteReply = (id: string, vote: number) => {
        set(id, (data) => ({ ...data, votes: data.votes + (vote === 1 ? 1 : -1), isUpvoted: vote === 1 }));
    }

    let isNewlyCreated = data && activePostId === data.id;
    let bg = isNewlyCreated ? "beige" : "white";

    let body = (
        <div className="mb-4">
            {
                data &&
                <div className="d-flex position-relative">
                    <div className="wb-user-comment__options">
                        <div className="d-flex gap-2">
                            {
                                (userInfo && userInfo.id === data.userId) &&
                                <>
                                    <span className="wb-user-comment__options__item" onClick={handleEdit}>
                                        <FaPencil />
                                    </span>
                                    <span className="wb-user-comment__options__item" onClick={handleDelete}>
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
                        <div className={"rounded border p-2 mb-1"} style={{ background: bg }}>
                            <div>
                                <ProfileName userId={data.userId} userName={data.userName} />
                            </div>
                            <p className="wb-discuss-question__description mt-2">{data.message}</p>
                        </div>
                        <div className="d-flex justify-content-between">
                            <div className="d-flex gap-2 align-items-center">
                                <div className="small">
                                    <span className={"wb-discuss-voting__button" + (data.isUpvoted ? " text-black" : "")} onClick={handleVote}>
                                        <FaThumbsUp />
                                    </span>
                                    <span className="ms-1">{data.votes}</span>
                                </div>
                                <button className="small wb-user-comment-footer__reply" onClick={handleReply}>
                                    Reply
                                </button>
                                {
                                    (parentId === null && replyCount > 0) &&
                                    <>
                                        <button disabled={defaultReplies !== null} className={"small wb-user-comment-footer__replies " + (repliesVisible ? "text-secondary" : "text-black")} onClick={toggleReplies}>
                                            {replyCount} replies
                                        </button>
                                    </>
                                }
                            </div>
                            <div>
                                <div>
                                    <small className="text-secondary">{DateUtils.format2(new Date(data.date), true)}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
            {
                parentId === null && (repliesVisible || data === null) &&
                <div className={"mt-2 " + (data ? "ms-5" : "")}>
                    {
                        error ?
                            <p>{error}</p>
                            :
                            <>
                                {
                                    (results.length > 0 && results[0].index > 0) &&
                                    <Button disabled={isLoading} onClick={handleLoadPrev} variant="primary" size="sm" className="mb-2 w-100">Load previous</Button>
                                }
                                {
                                    (results.length > 0 && activePostId !== null && isActivePostReply) ?
                                        <div key={results[0].id}>
                                            <CommentNode
                                                code={code}
                                                data={results[0]}
                                                parentId={data ? data.id : null}
                                                filter={2}
                                                onReply={onReply}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onVote={voteReply}
                                                setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                                                addReplyToParent={addReply}
                                                editParentReply={editReply}
                                                deleteParentReply={deleteReply}
                                                activePostId={activePostId}
                                                setActivePostId={setActivePostId}
                                                setShowAllComments={setShowAllComments}
                                                showAllComments={false}
                                                isActivePostReply={false}
                                                defaultReplies={results.slice(1)}
                                            />
                                        </div>
                                        :
                                        results.map((reply, idx) => {
                                            let node = results.length === idx + 1 ?
                                                <CommentNode
                                                    ref={lastCommentRef}
                                                    code={code}
                                                    data={reply}
                                                    parentId={data ? data.id : null}
                                                    filter={2}
                                                    onReply={onReply}
                                                    onEdit={onEdit}
                                                    onDelete={onDelete}
                                                    onVote={voteReply}
                                                    setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                                                    addReplyToParent={addReply}
                                                    editParentReply={editReply}
                                                    deleteParentReply={deleteReply}
                                                    activePostId={activePostId}
                                                    setActivePostId={setActivePostId}
                                                    showAllComments={false}
                                                    setShowAllComments={setShowAllComments}
                                                    isActivePostReply={false}
                                                    defaultReplies={null}
                                                />
                                                :
                                                <CommentNode
                                                    code={code}
                                                    data={reply}
                                                    parentId={data ? data.id : null}
                                                    filter={2}
                                                    onReply={onReply}
                                                    onEdit={onEdit}
                                                    onDelete={onDelete}
                                                    onVote={voteReply}
                                                    setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                                                    addReplyToParent={addReply}
                                                    editParentReply={editReply}
                                                    deleteParentReply={deleteReply}
                                                    activePostId={activePostId}
                                                    setActivePostId={setActivePostId}
                                                    showAllComments={false}
                                                    setShowAllComments={setShowAllComments}
                                                    isActivePostReply={false}
                                                    defaultReplies={null}
                                                />
                                            return (
                                                reply.id === activePostId ?
                                                    <div key={reply.id} ref={activePostRef}>
                                                        {
                                                            node
                                                        }
                                                    </div>
                                                    :
                                                    <div key={reply.id}>
                                                        {
                                                            node
                                                        }
                                                    </div>
                                            )
                                        })
                                }
                            </>
                    }
                </div>
            }
        </div>
    )
    let content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content
})

export type {
    ICodeComment
}

export default CommentNode