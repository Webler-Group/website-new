import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/context/authContext';
import { FaPencil, FaThumbsUp, FaTrash } from 'react-icons/fa6';
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Button } from 'react-bootstrap';
import useComments from '../hooks/useComments';
import { ICode } from '../../codes/components/Code';
import { useNavigate } from 'react-router-dom';

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
    setDefaultOnReplyCallback: (callback: (data: ICodeComment) => void) => void;
    addReplyToParent: (data: ICodeComment) => void;
}

const CommentNode = React.forwardRef(({ code, data, parentId, filter, onReply, setDefaultOnReplyCallback, addReplyToParent }: CommentNodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { userInfo } = useAuth();
    const navigate = useNavigate()
    const [replyCount, setReplyCount] = useState(data ? data.answers : 0);
    const [repliesVisible, setRepliesVisible] = useState(data === null);
    const [lastIndex, setLastIndex] = useState({ index: 0 });
    const {
        isLoading,
        error,
        results,
        hasNextPage,
        add
    } = useComments(code.id!, data ? data.id : null, 20, 0, lastIndex, filter, repliesVisible);

    useEffect(() => {
        if (data === null) {
            setDefaultOnReplyCallback(() => addReply);
        }
    }, [])

    useEffect(() => {
        if (repliesVisible) {
            setLastIndex(() => ({ index: 0 }))
        }
    }, [code, filter, repliesVisible])

    const toggleReplies = () => {
        setRepliesVisible(visible => !visible);
    }

    const intObserver = useRef<IntersectionObserver>()
    const lastCommentRef = useCallback((comment: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(comments => {

            if (comments[0].isIntersecting && hasNextPage) {

                setLastIndex(() => ({ index: results[results.length - 1].index + 1 }));
            }
        })


        if (comment) intObserver.current.observe(comment)
    }, [isLoading, hasNextPage])

    const handleReply = () => {
        if (!data) {
            return
        }
        if (!userInfo) {
            navigate("/Login");
            return;
        }
        setRepliesVisible(true);
        onReply(parentId ? parentId : data.id, parentId ? addReplyToParent : addReply);
    }

    const addReply = (data: ICodeComment) => {
        add(data)
        setReplyCount(count => count + 1)
    }

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
                                    <span>
                                        <FaPencil />
                                    </span>
                                    <span>
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
                        <div className={"rounded border p-2 mb-1 bg-light"}>
                            <div>
                                <ProfileName userId={data.userId} userName={data.userName} />
                            </div>
                            <p className="wb-discuss-question__description mt-2">{data.message}</p>
                        </div>
                        <div className="d-flex justify-content-between">
                            <div className="d-flex gap-2 align-items-center">
                                <div className="small">
                                    <span className={"wb-discuss-voting__button" + (data.isUpvoted ? " text-black" : "")}>
                                        <FaThumbsUp />
                                    </span>
                                    <span className="ms-1">{data.votes}</span>
                                </div>
                                <span className="small wb-user-comment-footer__reply" onClick={handleReply}>
                                    Reply
                                </span>
                                {
                                    (parentId === null && replyCount > 0) &&
                                    <>
                                        <span className={"small wb-user-comment-footer__replies " + (repliesVisible ? "text-secondary" : "text-black")} onClick={toggleReplies}>
                                            {replyCount} replies
                                        </span>
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
                                    <Button variant="primary" size="sm" className="mb-2 w-100">Load more</Button>
                                }
                                {
                                    results.map((reply, idx) => {
                                        return (
                                            <div key={reply.id}>
                                                {
                                                    results.length === idx + 1 ?
                                                        <CommentNode
                                                            ref={lastCommentRef}
                                                            code={code}
                                                            data={reply}
                                                            parentId={data ? data.id : null}
                                                            filter={2}
                                                            onReply={onReply}
                                                            setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                                                            addReplyToParent={addReply}
                                                        />
                                                        :
                                                        <CommentNode
                                                            code={code}
                                                            data={reply}
                                                            parentId={data ? data.id : null}
                                                            filter={2}
                                                            onReply={onReply}
                                                            setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                                                            addReplyToParent={addReply}
                                                        />
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