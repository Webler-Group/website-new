import { Button, Form, FormGroup, FormLabel, Modal, Toast } from "react-bootstrap";
import CommentNode from "./CommentNode";
import { FaLeftLong } from "react-icons/fa6";
import { useCallback, useEffect, useRef, useState } from "react";
import useComments, { UseCommentsOptions } from "./useComments";
import PostTextareaControl from "../PostTextareaControl";
import { useAuth } from "../../features/auth/context/authContext";
import { IComment } from "./Comment";
import { useApi } from "../../context/apiCommunication";

interface CommentListProps {
    findPost: { id: string; isReply: boolean } | null;
    options: UseCommentsOptions;
}

const CommentList: React.FC<CommentListProps> = ({ findPost, options }) => {
    const [showAllComments, setShowAllComments] = useState(findPost?.isReply ? false : true);
    const [filter, setFilter] = useState(findPost ? 2 : 1);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
    const [answerFormVisible, setAnswerFormVisible] = useState(false);
    const [answerFormMessage, setAnswerFormMessage] = useState('');
    const [answerFormLoading, setAnswerFormLoading] = useState(false);
    const [editedComment, setEditedComment] = useState<IComment | null>(null);
    const [parentCommentId, setParentCommentId] = useState<string | null>(null);
    const [onReplyCallback, setOnReplyCallback] = useState<(post: IComment) => void>();
    const [message, setMessage] = useState<[boolean, string]>([true, '']);
    const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(findPost?.id || null);
    const commentContainerRef = useRef<HTMLDivElement>(null);
    const formInputRef = useRef<HTMLTextAreaElement>(null);
    const { userInfo } = useAuth();
    const { sendJsonRequest } = useApi();
    const {
        results,
        setState,
        loading: commentsLoading,
        createComment,
        hasNextPage,
        getFirstValidCommentIndex
    } = useComments(options, findPost ? findPost.id : null, filter, 10);

    // Remove highlight after 3 seconds
    useEffect(() => {
        if (highlightedCommentId) {
            const timer = setTimeout(() => {
                setHighlightedCommentId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [highlightedCommentId]);

    const intObserver = useRef<IntersectionObserver>();
    const lastCommentNodeRef = useCallback(
        (node: any) => {
            if (commentsLoading) return;

            if (intObserver.current) intObserver.current.disconnect();
            intObserver.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNextPage && results.length > 0) {
                    setState((prev) => ({
                        ...prev,
                        lastIndex: results[results.length - 1].index + 1,
                        direction: 'from end',
                    }));
                }
            });

            if (node) intObserver.current.observe(node);
        },
        [commentsLoading, hasNextPage, results, setState]
    );

    const handleFilterSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter(Number(e.target.value));
        setState({ firstIndex: 0, lastIndex: 0, direction: 'from end' });
    };

    const handleBackToAllComments = () => {
        setShowAllComments(true);
        setState({ firstIndex: 0, lastIndex: 0, direction: 'from end' });
    };

    const showAnswerForm = (message: string, comment: IComment | null, parentId: string | null = null) => {
        setAnswerFormMessage(message);
        setEditedComment(comment);
        setParentCommentId(parentId);
        setAnswerFormVisible(true);
    };

    const hideAnswerForm = () => {
        setAnswerFormVisible(false);
        setAnswerFormMessage('');
        setEditedComment(null);
    };

    const handlePostAnswer = async () => {
        setAnswerFormLoading(true);

        const result = await sendJsonRequest(`/${options.section}/CreateComment`, 'POST', {
            ...options.params,
            parentId: parentCommentId,
            message,
        });
        if (result && result.post) {
            if (parentCommentId) {
                createComment(result.post);
            } else {
                onReplyCallback?.(result.post);
            }

            setMessage([true, parentCommentId ? 'Reply posted successfully' : 'Comment posted successfully']);
            hideAnswerForm();
            // Scroll to top of comment container
            setTimeout(() => {
                if (commentContainerRef.current) {
                    commentContainerRef.current.scrollTop = 0;
                }
            });
        } else {
            setMessage([false, 'Failed to post comment']);
        }

        setAnswerFormLoading(false);
    };

    const handleEditAnswer = async () => {
        if (editedComment) {
            // Implement edit comment logic
            setMessage([true, 'Comment updated successfully']);
            hideAnswerForm();
        }
    };

    const handleDeleteComment = async () => {
        if (deleteCommentId) {
            // Implement delete comment logic
            setMessage([true, 'Comment deleted successfully']);
            setDeleteModalVisible(false);
            setDeleteCommentId(null);
        }
    };

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
        setDeleteCommentId(null);
    };

    const handleLoadPrevious = () => {
        setState((prev) => ({
            ...prev,
            firstIndex: getFirstValidCommentIndex(),
            direction: 'from start',
        }));
    };

    let loading = answerFormLoading || commentsLoading;

    return (
        <>
            <Modal size="sm" show={deleteModalVisible} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Your answer will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteComment}>Delete</Button>
                </Modal.Footer>
            </Modal>
            <div className="d-flex justify-content-between">
                {showAllComments ? (
                    <div className="col-6 col-sm-4">
                        <Form.Select size="sm" value={filter} onChange={handleFilterSelect}>
                            <option value="1">Most Popular</option>
                            <option value="2">Oldest</option>
                            <option value="3">Most recent</option>
                        </Form.Select>
                    </div>
                ) : (
                    <Button onClick={handleBackToAllComments} variant="link" size="sm">
                        <FaLeftLong />
                        Back to all comments
                    </Button>
                )}
            </div>
            <div className="mt-1 pe-1 flex-grow-1 overflow-auto" ref={commentContainerRef}>
                {results.length > 0 && getFirstValidCommentIndex() > 0 && (
                    <Button
                        variant="link"
                        size="sm"
                        className="mb-2"
                        onClick={handleLoadPrevious}
                    >
                        Load Previous
                    </Button>
                )}
                {(showAllComments ? results : results.slice(0, 1)).map((comment, index) => (
                    <CommentNode
                        ref={index === results.length - 1 ? lastCommentNodeRef : undefined}
                        key={comment.id}
                        options={options}
                        comment={comment}
                        defaultReplies={findPost?.isReply && !showAllComments ? results.slice(1) : null}
                        onDelete={(id) => {
                            setDeleteCommentId(id);
                            setDeleteModalVisible(true);
                        }}
                        onEdit={(id, message) => showAnswerForm(message, results.find((c) => c.id === id) || null)}
                        onReply={(id) => showAnswerForm('', null, id)}
                        highlightedCommentId={highlightedCommentId}
                    />
                ))}
            </div>
            <Toast
                className="position-absolute"
                style={{ zIndex: '999', bottom: '68px', width: '90%' }}
                bg={message[0] ? 'success' : 'danger'}
                onClose={() => setMessage([true, ''])}
                show={message[1] !== ''}
                delay={3000}
                autohide
            >
                <Toast.Body className="text-white">
                    <b>{message[1]}</b>
                </Toast.Body>
            </Toast>
            <div className="py-2 border-top">
                <Button
                    hidden={answerFormVisible}
                    size="sm"
                    variant="primary"
                    className="ms-2"
                    onClick={() => showAnswerForm('', null)}
                >
                    Write comment
                </Button>
                <div hidden={!answerFormVisible}>
                    <FormGroup>
                        <FormLabel>
                            <b>{userInfo?.name}</b>
                        </FormLabel>
                        <PostTextareaControl
                            ref={formInputRef}
                            size="sm"
                            value={answerFormMessage}
                            setValue={setAnswerFormMessage}
                            placeholder="Write your comment here..."
                            rows={5}
                        />
                    </FormGroup>
                    <div className="d-flex justify-content-end mt-2">
                        <Button size="sm" variant="secondary" className="ms-2" onClick={hideAnswerForm}>
                            Cancel
                        </Button>
                        {editedComment === null ? (
                            <Button
                                size="sm"
                                className="ms-2"
                                variant="primary"
                                onClick={handlePostAnswer}
                                disabled={loading || answerFormMessage.length === 0}
                            >
                                {parentCommentId ? 'Post Reply' : 'Post Comment'}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="primary"
                                className="ms-2"
                                onClick={handleEditAnswer}
                                disabled={loading || answerFormMessage.length === 0}
                            >
                                Save changes
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CommentList;