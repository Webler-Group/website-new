import { Button } from "react-bootstrap";
import Comment, { IComment } from "./Comment";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReplyNode from "./ReplyNode";
import useReplies from "./useReplies";
import { UseCommentsOptions } from "./useComments";

interface CommentNodeProps {
    options: UseCommentsOptions;
    comment: IComment;
    defaultReplies: IComment[] | null;
    onDelete: (post: IComment, onDeleteCallback?: (id: string) => void) => void;
    onEdit: (post: IComment, onEditCallback?: (id: string, setter: (prev: IComment) => IComment) => void) => void;
    onReply: (id: string, onReplyCallback: (post: IComment) => void, message?: string) => void;
    highlightedCommentId: string | null;
}

const CommentNode = React.forwardRef<HTMLDivElement, CommentNodeProps>(({ options, comment, defaultReplies, onDelete, onEdit, onReply, highlightedCommentId }, ref) => {
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

    const handleReply = (message?: string) => {
        setRepliesVisible(true);
        onReply(comment.id, (post: IComment) => {
            createReply(post);
            setRepliesCount(prev => prev + 1);
        }, message);
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

    const onReplyReply = () => {
        handleReply(`[user id="${comment.userId}"]${comment.userName}[/user]\n`)
    }

    const onReplyDelete = (reply: IComment) => {
        onDelete(reply, (postId: string) => {
            deleteReply(postId);
            setRepliesCount(prev => prev - 1);
        });
    }

    return (
        <div className="mb-3" ref={ref}>
            <Comment
                comment={comment}
                repliesCount={repliesCount}
                repliesVisible={repliesVisible}
                handleDelete={handleDelete}
                handleEdit={handleEdit}
                handleReply={handleReply}
                handleToggleReplies={handleToggleReplies}
                isHighlighted={highlightedCommentId === comment.id}
            />
            {repliesVisible && (
                <div className="ms-5 mt-2">
                    {replies.length > 0 && getFirstValidReplyIndex() > 0 && (
                        <Button
                            variant="primary"
                            size="sm"
                            className="mb-2 w-100"
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
                            onReply={() => onReplyReply()}
                            highlightedCommentId={highlightedCommentId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default CommentNode;