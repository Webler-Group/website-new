import React from "react";
import Comment, { IComment } from "./Comment";
import { Button } from "react-bootstrap";
import { useAuth } from "../../features/auth/context/authContext";

interface ReplyNodeProps {
    comment: IComment;
    onDelete: () => void;
    onEdit: () => void;
    highlightedCommentId: string | null;
}

const ReplyNode = React.forwardRef<HTMLDivElement, ReplyNodeProps>(({ comment, onDelete, onEdit, highlightedCommentId }, ref) => {
    const { userInfo } = useAuth();

    return (
        <div className={`comment-node p-2 border-bottom ${highlightedCommentId === comment.id ? 'bg-warning' : ''}`} ref={ref}>
            <Comment comment={comment} />
            <div className="d-flex">
                <span className="me-3">Votes: {comment.votes}</span>
                <span>Replies: {comment.answers}</span>
            </div>
            {
                userInfo?.id == comment.userId && (
                    <>
                        <Button variant="link" size="sm" onClick={onDelete}>
                            Delete
                        </Button>
                        <Button variant="link" size="sm" onClick={onEdit}>
                            Edit
                        </Button>
                    </>
                )
            }
        </div>
    );
});

export default ReplyNode;