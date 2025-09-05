import { Button } from "react-bootstrap";
import Comment, { IComment } from "./Comment";
import React, { useCallback, useEffect, useRef, useState } from "react";
import useReplies from "./useReplies";
import { UseCommentsOptions } from "./useComments";

interface CommentNodeProps {
    options: UseCommentsOptions;
    comment: IComment;
    defaultReplies: IComment[] | null;
    onDelete: (post: IComment, onDeleteCallback?: (id: string) => void) => void;
    onEdit: (post: IComment, onEditCallback?: (id: string, setter: (prev: IComment) => IComment) => void) => void;
    onReply: (id: string, onReplyCallback: (post: IComment) => void, message?: string) => void;
    onShowVotes: (id: string) => void;
    highlightedCommentId: string | null;
    onVote: (id: string, vote: number) => void;
}

const CommentNode = React.forwardRef<HTMLDivElement, CommentNodeProps>(({
    options,
    comment,
    defaultReplies,
    onDelete,
    onEdit,
    onReply,
    onShowVotes,
    highlightedCommentId,
    onVote
}, ref) => {
    const [repliesVisible, setRepliesVisible] = useState(defaultReplies !== null);
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
        [repliesLoading, hasNextReplyPage, replies]
    );

    useEffect(() => {
        if (comment.answers == 0) {
            setRepliesVisible(false);
        }
    }, [comment.answers]);

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

    const onReplyReply = () => {
        setRepliesVisible(true);
        onReply(comment.id, (post: IComment) => {
            createReply(post);
        }, `[user id="${comment.userId}"]${comment.userName}[/user]\n`);
    }

    const onReplyDelete = (reply: IComment) => {
        onDelete(reply, (postId: string) => {
            deleteReply(postId);
        });
    }

    const onReplyVote = (id: string, vote: number) => {
        editReply(id, prev => ({ ...prev, votes: prev.votes + 2 * vote - 1, isUpvoted: vote == 1 }))
    }

    return (
        <div className="mb-3" ref={ref}>
            <Comment
                comment={comment}
                repliesVisible={repliesVisible}
                handleDelete={handleDelete}
                handleEdit={handleEdit}
                handleReply={handleReply}
                handleToggleReplies={handleToggleReplies}
                handleShowVotes={() => onShowVotes(comment.id)}
                isHighlighted={highlightedCommentId === comment.id}
                onVote={onVote}
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
                        <div key={reply.id} className="mb-2" ref={replies.length - 1 == index ? lastReplyNodeRef : undefined}>
                            <Comment
                                comment={reply}
                                handleDelete={() => onReplyDelete(reply)}
                                handleEdit={() => onReplyEdit(reply)}
                                handleReply={() => onReplyReply()}
                                handleShowVotes={() => onShowVotes(reply.id)}
                                isHighlighted={highlightedCommentId === reply.id}
                                onVote={onReplyVote}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default CommentNode;