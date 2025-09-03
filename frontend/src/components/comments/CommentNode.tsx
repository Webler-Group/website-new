import { Button } from "react-bootstrap";
import Comment, { IComment } from "./Comment";
import React, { useCallback, useRef, useState } from "react";
import ReplyNode from "./ReplyNode";
import useReplies from "./useReplies";
import { UseCommentsOptions } from "./useComments";

interface CommentNodeProps {
    options: UseCommentsOptions;
    comment: IComment;
    defaultReplies: IComment[] | null;
    onDelete?: (id: string) => void;
    onEdit?: (id: string, message: string) => void;
    onReply?: (id: string) => void;
    setReplyCallback?: (callback: (post: IComment) => void) => void;
    highlightedCommentId: string | null;
}

const CommentNode = React.forwardRef<HTMLDivElement, CommentNodeProps>(({ options, comment, defaultReplies, onDelete, onEdit, onReply, setReplyCallback, highlightedCommentId }, ref) => {
    const [repliesVisible, setRepliesVisible] = useState(false);
    const {
        results: replies,
        setState: setReplyState,
        loading: repliesLoading,
        hasNextPage: hasNextReplyPage,
        getFirstValidCommentIndex: getFirstValidReplyIndex
    } = useReplies(options, repliesVisible, comment.id, defaultReplies, 10);

    const intObserver = useRef<IntersectionObserver>();
    const lastReplyNodeRef = useCallback(
        (node: any) => {
            if (repliesLoading) return;

            if (intObserver.current) intObserver.current.disconnect();
            intObserver.current = new IntersectionObserver((entries) => {
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

    const handleLoadPreviousReplies = () => {
        setReplyState((prev) => ({
            ...prev,
            firstIndex: getFirstValidReplyIndex(),
            direction: 'from start',
        }));
    };

    return (
        <div className={`comment-node p-2 border-bottom ${highlightedCommentId === comment.id ? 'bg-warning' : ''}`} ref={ref}>
            <Comment comment={comment} />
            <div className="d-flex align-items-center">
                <span className="me-3">Votes: {comment.votes}</span>
                <span className="me-3">Replies: {comment.answers}</span>
                {comment.answers > 0 && (
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => setRepliesVisible(!repliesVisible)}
                    >
                        {repliesVisible ? 'Hide Replies' : 'Show Replies'}
                    </Button>
                )}
                {onReply && (
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => onReply(comment.id)}
                    >
                        Reply
                    </Button>
                )}
            </div>
            {onDelete && (
                <Button variant="link" size="sm" onClick={() => onDelete(comment.id)}>
                    Delete
                </Button>
            )}
            {onEdit && (
                <Button variant="link" size="sm" onClick={() => onEdit(comment.id, comment.message)}>
                    Edit
                </Button>
            )}
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
                            onDelete={onDelete}
                            onEdit={onEdit}
                            highlightedCommentId={highlightedCommentId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default CommentNode;