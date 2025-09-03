import React from "react";
import Comment, { IComment } from "./Comment";

interface ReplyNodeProps {
    comment: IComment;
    onDelete: () => void;
    onEdit: () => void;
    onReply: () => void;
    highlightedCommentId: string | null;
}

const ReplyNode = React.forwardRef<HTMLDivElement, ReplyNodeProps>(({ comment, onDelete, onEdit, onReply, highlightedCommentId }, ref) => {
    return (
        <div className="mb-2" ref={ref}>
            <Comment
                comment={comment}
                handleDelete={onDelete}
                handleEdit={onEdit}
                handleReply={onReply}
                isHighlighted={highlightedCommentId === comment.id}
            />
        </div>
    );
});

export default ReplyNode;