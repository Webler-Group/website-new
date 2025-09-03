import { Button } from "react-bootstrap";
import Comment, { IComment } from "./Comment";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReplyNode from "./ReplyNode";
import useReplies from "./useReplies";
import { UseCommentsOptions } from "./useComments";
import { useAuth } from "../../features/auth/context/authContext";

interface CommentNodeProps {
    options: UseCommentsOptions;
    comment: IComment;
    defaultReplies: IComment[] | null;
    onDelete: (post: IComment, onDeleteCallback?: (id: string) => void) => void;
    onEdit: (post: IComment, onEditCallback?: (id: string, setter: (prev: IComment) => IComment) => void) => void;
    onReply: (id: string, onReplyCallback: (post: IComment) => void) => void;
    highlightedCommentId: string | null;
}

const CommentNode = React.forwardRef<HTMLDivElement, CommentNodeProps>(({ options, comment, defaultReplies, onDelete, onEdit, onReply, highlightedCommentId }, ref) => {
    const { userInfo } = useAuth();
    const [repliesVisible, setRepliesVisible] = useState(defaultReplies !== null);
    const [repliesCount, setRepliesCount] = useState(comment.answers);
    const {
        results: replies,
        setState: setReplyState,
        loading: repliesLoading,
        hasNextPage: hasNextReplyPage,
        getFirstValidCommentIndex: getFirstValidReplyIndex,
        createReply,
        editReply,
        deleteReply
    } = useReplies(options, repliesVisible, comment.id, defaultReplies, 10);

    const intObserver = useRef<IntersectionObserver>();
    const lastReplyNodeRef = useCallback(
        (node: any) => {
            if (repliesLoading) return;

            if (intObserver.current) intObserver.current.disconnect();
            intObserver.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    console.log("intersecting", hasNextReplyPage, replies);
                }

                if (entries[0].isIntersecting && hasNextReplyPage && replies.length > 0) {
                    setReplyState((prev) => ({
                        ...prev,
                        lastIndex: replies[replies.length - 1].index + 1,
                        direction: 'from end',
                    }));
                }
            });

            if (node) intObserver.current.observe(node);
        },
        [repliesLoading, hasNextReplyPage, replies, setReplyState]
    );

    useEffect(() => {
        if (repliesCount == 0) {
            setRepliesVisible(false);
        }
    }, [repliesCount]);

    const handleLoadPreviousReplies = () => {
        setReplyState((prev) => ({
            ...prev,
            firstIndex: getFirstValidReplyIndex(),
            direction: 'from start',
        }));
    };

    const handleReply = () => {
        setRepliesVisible(true);
        onReply(comment.id, (post: IComment) => {
            createReply(post);
            setRepliesCount(prev => prev + 1);
        });
    }

    const handleEdit = () => {
        onEdit(comment);
    }

    const handleDelete = () => {
        onDelete(comment);
    }

    const handleToggleReplies = () => {
        setRepliesVisible(prev => !prev);
    }

    const onReplyEdit = (reply: IComment) => {
        onEdit(reply, editReply);
    }

    const onReplyDelete = (reply: IComment) => {
        onDelete(reply, (postId: string) => {
            deleteReply(postId);
            setRepliesCount(prev => prev - 1);
        });
    }

    return (
        <div className={`comment-node p-2 border-bottom ${highlightedCommentId === comment.id ? 'bg-warning' : ''}`} ref={ref}>
            <Comment comment={comment} />
            <div className="d-flex align-items-center">
                <span className="me-3">Votes: {comment.votes}</span>
                <span className="me-3">Replies: {repliesCount}</span>
                {repliesCount > 0 && (
                    <Button
                        variant="link"
                        size="sm"
                        onClick={handleToggleReplies}
                    >
                        {repliesVisible ? 'Hide Replies' : 'Show Replies'}
                    </Button>
                )}
                <Button
                    variant="link"
                    size="sm"
                    onClick={handleReply}
                >
                    Reply
                </Button>
            </div>
            {
                userInfo?.id == comment.userId && (
                    <>
                        <Button variant="link" size="sm" onClick={handleDelete}>
                            Delete
                        </Button>
                        <Button variant="link" size="sm" onClick={handleEdit}>
                            Edit
                        </Button>
                    </>
                )
            }
            {repliesVisible && (
                <div className="ms-4">
                    {replies.length > 0 && getFirstValidReplyIndex() > 0 && (
                        <Button
                            variant="link"
                            size="sm"
                            className="mb-2"
                            onClick={handleLoadPreviousReplies}
                            disabled={repliesLoading}
                        >
                            Load Previous
                        </Button>
                    )}
                    {replies.map((reply, index) => (
                        <ReplyNode
                            ref={index == replies.length - 1 ? lastReplyNodeRef : undefined}
                            key={reply.id}
                            comment={reply}
                            onDelete={() => onReplyDelete(reply)}
                            onEdit={() => onReplyEdit(reply)}
                            highlightedCommentId={highlightedCommentId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default CommentNode;