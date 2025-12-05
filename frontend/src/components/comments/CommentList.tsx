import { Button, Form, FormGroup, FormLabel, Modal, Toast } from "react-bootstrap";
import CommentNode from "./CommentNode";
import { FaLeftLong } from "react-icons/fa6";
import { useCallback, useEffect, useRef, useState } from "react";
import useComments, { UseCommentsOptions } from "./useComments";
import PostTextareaControl from "../PostTextareaControl";
import { useAuth } from "../../features/auth/context/authContext";
import { IComment } from "./Comment";
import { useApi } from "../../context/apiCommunication";
import ReactionsList from "../reactions/ReactionsList";
import { useNavigate } from "react-router-dom";
import "./CommentList.css"
import PostAttachmentSelect from "../PostAttachmentSelect";

interface CommentListProps {
    findPost: { id: string; isReply: boolean } | null;
    options: UseCommentsOptions;
    setCommentCount?: (setter: (prev: number) => number) => void;
}

const CommentList: React.FC<CommentListProps> = ({ findPost, options, setCommentCount }) => {
    const [showAllComments, setShowAllComments] = useState(findPost?.isReply ? false : true);
    const [filter, setFilter] = useState(findPost ? 2 : 1);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [answerFormVisible, setAnswerFormVisible] = useState(false);
    const [answerFormMessage, setAnswerFormMessage] = useState('');
    const [answerFormLoading, setAnswerFormLoading] = useState(false);
    const [editedComment, setEditedComment] = useState<IComment | null>(null);
    const [parentCommentId, setParentCommentId] = useState<string | null>(null);
    const activeParentCommentRef = useRef<HTMLDivElement>(null);
    const [onReplyCallback, setOnReplyCallback] = useState<(post: IComment) => void>();
    const [onEditCallback, setOnEditCallback] = useState<(id: string, setter: (prev: IComment) => IComment) => void>();
    const [onDeleteCallback, setOnDeleteCallback] = useState<(id: string) => void>();
    const [message, setMessage] = useState<{ success: boolean; message?: string; errors?: any[]; }>({ success: true });
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
        editComment,
        deleteComment,
        hasNextPage,
        getFirstValidCommentIndex,
        error
    } = useComments(options, findPost ? findPost.id : null, filter, 10, showAllComments);
    const [commentVotesModalVisible, setCommentVotesModalVisible] = useState(false);
    const [commentVotesModalOptions, setCommentVotesModalOptions] = useState({ parentId: "" });
    const navigate = useNavigate();

    // Remove highlight after 3 seconds
    useEffect(() => {
        if (highlightedCommentId) {
            const timer = setTimeout(() => {
                setHighlightedCommentId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [highlightedCommentId]);

    useEffect(() => {
        if (error) {
            setMessage({ success: false, errors: error });
        }
    }, [error]);

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
        [commentsLoading, hasNextPage, results]
    );

    const handleFilterSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter(Number(e.target.value));
    };

    const handleBackToAllComments = () => {
        setShowAllComments(true);
    };

    const showAnswerForm = (post: IComment | null, parentId: string | null, message: string = "") => {
        if (!userInfo) {
            navigate("/Users/Login");
        }
        setAnswerFormMessage(message);
        setEditedComment(post);
        setParentCommentId(parentId);
        setAnswerFormVisible(true);

        setTimeout(() => {
            if (formInputRef.current) {
                formInputRef.current.focus();
            }
        });
    };

    const hideAnswerForm = () => {
        setAnswerFormVisible(false);
        setAnswerFormMessage('');
        setEditedComment(null);
    };

    const handlePostAnswer = async () => {
        if (!userInfo) return;

        setAnswerFormLoading(true);

        const result = await sendJsonRequest(`/${options.section}/CreateComment`, 'POST', {
            ...options.params,
            parentId: parentCommentId,
            message: answerFormMessage,
        });
        if (result && result.post) {
            const newPost = { ...result.post, index: -1, userName: userInfo.name, userAvatar: userInfo.avatarImage };
            if (parentCommentId) {
                onReplyCallback?.(newPost);
                editComment(parentCommentId, prev => ({ ...prev, answers: prev.answers + 1 }));
                // Scroll into view of parent
                setTimeout(() => {
                    if (activeParentCommentRef.current) {
                        activeParentCommentRef.current.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                });
            } else {
                createComment(newPost);
                // Scroll to top of comment container
                setTimeout(() => {
                    if (commentContainerRef.current) {
                        commentContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
                    }
                });
            }
            setCommentCount?.(prev => prev + 1);

            setMessage({ success: true, message: parentCommentId ? 'Reply posted successfully' : 'Comment posted successfully' });
            hideAnswerForm();
        } else {
            setMessage({ success: false, errors: result?.error });
        }

        setAnswerFormLoading(false);
    };

    const handleEditAnswer = async () => {
        if (editedComment) {
            setAnswerFormLoading(true);
            const result = await sendJsonRequest(`/${options.section}/EditComment`, "PUT", {
                message: answerFormMessage,
                id: editedComment.id
            });
            if (result && result.success) {
                if (editedComment.parentId) {
                    onEditCallback?.(result.data.id, prev => ({ ...prev, message: result.data.message, attachments: result.data.attachments }));
                } else {
                    editComment(result.data.id, prev => ({ ...prev, message: result.data.message, attachments: result.data.attachments }));
                }

                setMessage({ success: true, message: editedComment.parentId ? 'Reply edited successfully' : 'Comment edited successfully' });
                hideAnswerForm();
            } else {
                setMessage({ success: false, errors: result?.error });
            }
            setAnswerFormLoading(false);
        }
    };

    const handleDeleteComment = async () => {
        if (editedComment) {
            setAnswerFormLoading(true);
            const result = await sendJsonRequest(`/${options.section}/DeleteComment`, "DELETE", { id: editedComment.id });
            if (result && result.success) {
                if (editedComment.parentId) {
                    onDeleteCallback?.(editedComment.id);
                    editComment(editedComment.parentId, prev => ({ ...prev, answers: prev.answers - 1 }));
                } else {
                    deleteComment(editedComment.id);
                }
                setCommentCount?.(prev => prev - editedComment.answers - 1);
                setMessage({ success: true, message: editedComment.parentId ? 'Reply deleted successfully' : 'Comment deleted successfully' });
            } else {
                setMessage({ success: false, errors: result?.error });
            }
            setAnswerFormLoading(false);
            closeDeleteModal();
        }
    };

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
        setEditedComment(null);
    };

    const closeVotesModal = () => {
        setCommentVotesModalVisible(false);
    }

    const handleLoadPrevious = () => {
        setState((prev) => ({
            ...prev,
            firstIndex: getFirstValidCommentIndex(),
            direction: 'from start',
        }));
    };

    const onReply = (id: string, replyCallback: (post: IComment) => void, message?: string) => {
        setOnReplyCallback(() => replyCallback);
        showAnswerForm(null, id, message);
    }

    const onEdit = (post: IComment, editCallback?: (id: string, setter: (prev: IComment) => IComment) => void) => {
        setOnEditCallback(() => editCallback);
        showAnswerForm(post, post.parentId, post.message);
    }

    const onDelete = (post: IComment, deleteCallback?: (id: string) => void) => {
        setOnDeleteCallback(() => deleteCallback);
        setEditedComment(post);
        setDeleteModalVisible(true);
    }

    const onVote = (id: string, vote: number, error?: any[]) => {
        if (error) {
            setMessage({ success: false, errors: error });
        } else {
            editComment(id, prev => ({ ...prev, votes: prev.votes + 2 * vote - 1, isUpvoted: vote == 1 }));
        }
    }

    const onShowVotes = (id: string) => {
        setCommentVotesModalOptions({ parentId: id });
        setCommentVotesModalVisible(true);
    }

    const handlePostAttachments = (selected: string[]) => {
        setAnswerFormMessage(prev => (prev.trim().length == 0 || prev.endsWith("\n") ? prev : prev + "\n") + selected.join("\n") + "\n");
    }

    let loading = answerFormLoading || commentsLoading;

    return (
        <>
            <Modal style={{ zIndex: 1070 }} backdropClassName="wb-reactions-modal__backdrop" size="sm" show={deleteModalVisible} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Your answer will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteComment}>Delete</Button>
                </Modal.Footer>
            </Modal>
            <ReactionsList title="Likes" options={commentVotesModalOptions} visible={commentVotesModalVisible} onClose={closeVotesModal} showReactions={true} countPerPage={10} />
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
                {results.length > 0 && getFirstValidCommentIndex() > 0 && showAllComments && (
                    <Button
                        variant="primary"
                        size="sm"
                        className="mb-2 w-100"
                        onClick={handleLoadPrevious}
                        disabled={loading}
                    >
                        Load Previous
                    </Button>
                )}
                {
                    (showAllComments ? results : results.slice(0, 1)).map((comment, index) => {
                        let node = (<CommentNode
                            ref={index === results.length - 1 ? lastCommentNodeRef : undefined}
                            options={options}
                            comment={comment}
                            defaultReplies={findPost?.isReply && !showAllComments ? results.slice(1) : null}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onReply={onReply}
                            onShowVotes={onShowVotes}
                            highlightedCommentId={highlightedCommentId}
                            onVote={onVote}
                        />)
                        return comment.id == parentCommentId ?
                            <div key={comment.id} ref={activeParentCommentRef}>{node}</div> :
                            <div key={comment.id}>{node}</div>
                    })
                }
            </div>
            <Toast
                className="position-absolute"
                style={{ zIndex: '999', bottom: '68px', width: '90%' }}
                bg={message.success ? 'success' : 'danger'}
                onClose={() => setMessage(prev => ({ success: prev.success }))}
                show={(message.errors && message.errors.length > 0) || !!message.message}
                delay={2500}
                autohide
            >
                <Toast.Body className="text-white">
                    <b>{message.success ? message.message : message.errors ? message.errors[0]?.message : ""}</b>
                </Toast.Body>
            </Toast>
            <div className="py-2 border-top">
                <Button
                    hidden={answerFormVisible}
                    size="sm"
                    variant="primary"
                    className="ms-2"
                    onClick={() => showAnswerForm(null, null)}
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
                        <PostAttachmentSelect onSubmit={handlePostAttachments} />
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