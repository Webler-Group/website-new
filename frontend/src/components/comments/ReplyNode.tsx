import React from "react";
import Comment, { IComment } from "./Comment";
import { Button } from "react-bootstrap";

interface ReplyNodeProps {
    comment: IComment;
    onDelete?: (id: string) => void;
    onEdit?: (id: string, message: string) => void;
    highlightedCommentId: string | null;
}

const ReplyNode = React.forwardRef<HTMLDivElement, ReplyNodeProps>(({ comment, onDelete, onEdit, highlightedCommentId }, ref) => {
    return (
        <div className={`comment-node p-2 border-bottom ${highlightedCommentId === comment.id ? 'bg-warning' : ''}`} ref={ref}>
            <Comment comment={comment} />
            <div className="d-flex">
                <span className="me-3">Votes: {comment.votes}</span>
                <span>Replies: {comment.answers}</span>
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
        </div>
    );
});

export default ReplyNode;