import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/context/authContext';
import { FaPencil, FaThumbsUp, FaTrash } from 'react-icons/fa6';
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Button } from 'react-bootstrap';
import useComments from '../hooks/useComments';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../context/apiCommunication';
import ProfileAvatar from '../../../components/ProfileAvatar';
import PostAttachment, { IPostAttachment } from '../../discuss/components/PostAttachment';
import { parseMessage } from '../../../components/PostTextareaControl';

interface IComment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    date: string;
    message: string;
    answers: number;
    votes: number;
    isUpvoted: boolean;
    index: number;
    attachments: IPostAttachment[];
}

interface CommentNodeProps {
    options: { section: string; params: any; };
    data: IComment | null;
    parentId: string | null;
    filter: number;
    showAllComments: boolean;
    defaultReplies: IComment[] | null;
    activeParentPostId: string | null;
    activeParentPostRef: React.MutableRefObject<HTMLDivElement | null>;
    findPostId: string | null;
    findPostIsReply: boolean;
    onReply: (parentId: string, callback: (data: IComment) => void) => void;
    onEdit: (id: string, message: string, callback: (id: string, message: string, attachments: IPostAttachment[]) => void) => void;
    onDelete: (id: string, callback: (id: string, answers: number) => void, answers: number) => void;
    onVote: (id: string, vote: number) => void;
    setDefaultOnReplyCallback: (callback: (data: IComment) => void) => void;
    addReplyToParent: (data: IComment) => void;
    editParentReply: (id: string, message: string, attachments: IPostAttachment[]) => void;
    deleteParentReply: (id: string, answers: number) => void;
    setShowAllComments: (value: boolean) => void;
}

const CommentNode = React.forwardRef(({
    options,
    data,
    parentId,
    filter,
    showAllComments,
    defaultReplies,
    activeParentPostId,
    activeParentPostRef,
    findPostId,
    findPostIsReply,
    onReply,
    onEdit,
    onDelete,
    onVote,
    setDefaultOnReplyCallback,
    addReplyToParent,
    editParentReply,
    deleteParentReply,
    setShowAllComments
}: CommentNodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const navigate = useNavigate()

    const [replyCount, setReplyCount] = useState(data ? data.answers : 0);
    const [repliesVisible, setRepliesVisible] = useState(data === null || defaultReplies !== null);
    let initialIndicesState = (defaultReplies && defaultReplies.length > 0) ?
        { firstIndex: defaultReplies[0].index, lastIndex: defaultReplies[defaultReplies.length - 1].index, _state: 0 }
        :
        { firstIndex: 0, lastIndex: 0, _state: 0 }
    const [indices, setIndices] = useState(initialIndicesState);
    const {
        isLoading,
        error,
        results,
        hasNextPage,
        add,
        set,
        remove
    } = useComments(options, data ? data.id : null, 10, indices, filter, repliesVisible, findPostId, defaultReplies);

    useEffect(() => {
        if (data === null) {
            setDefaultOnReplyCallback(() => addReply);
        }
    }, [])

    useEffect(() => {
        if (repliesVisible && defaultReplies == null) {
            console.log(1);
            
            setIndices(() => ({ firstIndex: 0, lastIndex: 0, _state: 1 }))
        }
    }, [repliesVisible, filter])

    useEffect(() => {
        if(showAllComments) {
            console.log(2);
            
            setIndices(() => ({ firstIndex: 0, lastIndex: 0, _state: 1 }))
        }
    }, [showAllComments]);

    const intObserver = useRef<IntersectionObserver>()
    const lastCommentRef = useCallback((comment: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(comments => {

            if (comments[0].isIntersecting && hasNextPage) {
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
        const result = await sendJsonRequest(`/Discussion/VotePost`, "POST", { postId: data.id, vote });
        if (result.vote === vote) {
            onVote(data.id, vote);
        }
    }

    const addReply = (data: IComment) => {
        add(data)
        setReplyCount(count => count + 1)
    }

    const editReply = (id: string, message: string, attachments: IPostAttachment[]) => {
        set(id, data => ({ ...data, message, attachments }));
    }

    const deleteReply = (id: string, answers: number) => {
        remove(id)
        setReplyCount(count => count - 1 - answers)
        setShowAllComments(true);
    }

    const voteReply = (id: string, vote: number) => {
        set(id, (data) => ({ ...data, votes: data.votes + (vote === 1 ? 1 : -1), isUpvoted: vote === 1 }));
    }

    let body = (
        <div className="mb-4">
            {
                data &&
                <div className="d-flex position-relative gap-2">
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
                        <div className="wb-p-follow-item__avatar">
                            <ProfileAvatar size={32} avatarImage={data.userAvatar} />
                        </div>
                    </div>
                    <div className="flex-grow-1">
                        <div className={"rounded border p-2 mb-1 " + (findPostId == data?.id ? "bg-warning" : "bg-white")}>
                            <div>
                                <ProfileName userId={data.userId} userName={data.userName} />
                            </div>
                            <div className="wb-playground-comments__message mt-2">
                                {parseMessage(data.message)}
                            </div>
                            <div className="mt-2">
                                {
                                    data.attachments.map(attachment => {
                                        return (
                                            <div key={attachment.id} className="mt-1">
                                                <PostAttachment data={attachment} />
                                            </div>
                                        )
                                    })
                                }
                            </div>
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
                                    (results.length > 0 && findPostId && findPostIsReply && !defaultReplies) ?
                                    <div key={results[0].id}>
                                        <CommentNode
                                                options={options}
                                                ref={lastCommentRef}
                                                data={results[0]}
                                                parentId={data ? data.id : null}
                                                filter={2}
                                                findPostId={findPostId}
                                                findPostIsReply={findPostIsReply}
                                                onReply={onReply}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onVote={voteReply}
                                                setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                                                addReplyToParent={addReply}
                                                editParentReply={editReply}
                                                deleteParentReply={deleteReply}
                                                showAllComments={false}
                                                setShowAllComments={setShowAllComments}
                                                defaultReplies={results.slice(1)}
                                                activeParentPostId={activeParentPostId}
                                                activeParentPostRef={activeParentPostRef}
                                            />
                                    </div>
                                    :
                                    results.map((reply, idx) => {
                                        let node = results.length === idx + 1 ?
                                            <CommentNode
                                                options={options}
                                                ref={lastCommentRef}
                                                data={reply}
                                                parentId={data ? data.id : null}
                                                filter={2}
                                                findPostId={findPostId}
                                                findPostIsReply={findPostIsReply}
                                                onReply={onReply}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onVote={voteReply}
                                                setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                                                addReplyToParent={addReply}
                                                editParentReply={editReply}
                                                deleteParentReply={deleteReply}
                                                showAllComments={false}
                                                setShowAllComments={setShowAllComments}
                                                defaultReplies={null}
                                                activeParentPostId={activeParentPostId}
                                                activeParentPostRef={activeParentPostRef}
                                            />
                                            :
                                            <CommentNode
                                                options={options}
                                                data={reply}
                                                parentId={data ? data.id : null}
                                                filter={2}
                                                findPostId={findPostId}
                                                findPostIsReply={findPostIsReply}
                                                onReply={onReply}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onVote={voteReply}
                                                setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                                                addReplyToParent={addReply}
                                                editParentReply={editReply}
                                                deleteParentReply={deleteReply}
                                                showAllComments={false}
                                                setShowAllComments={setShowAllComments}
                                                defaultReplies={null}
                                                activeParentPostId={activeParentPostId}
                                                activeParentPostRef={activeParentPostRef}
                                            />
                                        return (
                                            reply.id == activeParentPostId ?
                                                <div key={reply.id} ref={activeParentPostRef}>
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
    IComment
}

export default CommentNode