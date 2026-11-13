import { Button, Form, FormGroup, FormLabel, Modal, Toast } from "../ui";
import CommentNode from "./CommentNode";
import { FaLeftLong, FaPlus } from "react-icons/fa6";
import { useCallback, useEffect, useRef, useState } from "react";
import useComments, { UseCommentsOptions } from "./useComments";
import PostTextareaControl from "../PostTextareaControl";
import { useAuth } from "../../features/auth/context/authContext";
import { useApi } from "../../context/apiCommunication";
import ReactionsList from "../reactions/ReactionsList";
import { useNavigate } from "react-router-dom";
import "./CommentList.css"
import PostAttachmentSelect from "../post-attachment-select/PostAttachmentSelect";
import { CommmentDetails, CreateCommentData, EditCommentData } from "./types";

interface CommentListProps {
    findPost: { id: string; isReply: boolean } | null;
    options: UseCommentsOptions;
    setCommentCount?: (setter: (prev: number) => number) => void;
    /**
     * Store for unsent comment texts. Pass a store owned by the parent page to keep drafts
     * even when CommentList unmounts (e.g. closing an offcanvas). Keys: "new", "reply:<target id>", "edit:<id>".
     */
    drafts?: Map<string, string>;
}

const getDraftKey = (editedPost: CommmentDetails | null, replyTarget: CommmentDetails | null) =>
    editedPost ? `edit:${editedPost.id}` : replyTarget ? `reply:${replyTarget.id}` : "new";

const CommentList: React.FC<CommentListProps> = ({ findPost, options, setCommentCount, drafts }) => {
    const localDraftsRef = useRef(new Map<string, string>());
    const draftStore = drafts ?? localDraftsRef.current;
    const [showAllComments, setShowAllComments] = useState(findPost?.isReply ? false : true);
    const [filter, setFilter] = useState(findPost ? 2 : 1);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [answerFormVisible, setAnswerFormVisible] = useState(false);
    const [answerFormMessage, setAnswerFormMessage] = useState('');
    const [answerFormLoading, setAnswerFormLoading] = useState(false);
    const [editedComment, setEditedComment] = useState<CommmentDetails | null>(null);
    const [parentCommentId, setParentCommentId] = useState<string | null>(null);
    const [replyTarget, setReplyTarget] = useState<CommmentDetails | null>(null);
    const activeParentCommentRef = useRef<HTMLDivElement>(null);
    const [onReplyCallback, setOnReplyCallback] = useState<(post: CommmentDetails) => void>();
    const [onEditCallback, setOnEditCallback] = useState<(id: string, setter: (prev: CommmentDetails) => CommmentDetails) => void>();
    const [onDeleteCallback, setOnDeleteCallback] = useState<(id: string) => void>();
    const [message, setMessage] = useState<{ success: boolean; message?: string; errors?: { message: string }[]; }>({ success: true });
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
    const [postAttachmentSelectVisible, setPostAttachmentSelectVisible] = useState(false);
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

    const intObserver = useRef<IntersectionObserver>(null);
    const lastCommentNodeRef = useCallback(
        (node: HTMLDivElement) => {
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

    // Remember what is typed so it can be restored when the form is opened again
    useEffect(() => {
        if (!answerFormVisible) return;
        const key = getDraftKey(editedComment, replyTarget);
        if (answerFormMessage.length > 0) {
            draftStore.set(key, answerFormMessage);
        } else {
            draftStore.delete(key);
        }
    }, [answerFormMessage, answerFormVisible, editedComment, replyTarget, draftStore]);

    const showAnswerForm = (post: CommmentDetails | null, parentId: string | null, message: string = "", target: CommmentDetails | null = null) => {
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        setAnswerFormMessage(draftStore.get(getDraftKey(post, target)) ?? message);
        setEditedComment(post);
        setParentCommentId(parentId);
        setReplyTarget(target);
        setAnswerFormVisible(true);

        setTimeout(() => {
            if (formInputRef.current) {
                // Don't let the browser scroll on focus; the list keeps the target comment visible itself
                formInputRef.current.focus({ preventScroll: true });
            }
        });
    };

    const hideAnswerForm = () => {
        draftStore.delete(getDraftKey(editedComment, replyTarget));
        setAnswerFormVisible(false);
        setAnswerFormMessage('');
        setEditedComment(null);
        setReplyTarget(null);
    };

    /** Scrolls the comment list (only the list, not the page) so the comment is fully visible */
    const scrollToComment = (id: string, behavior: ScrollBehavior = "smooth") => {
        const container = commentContainerRef.current;
        const element = container?.querySelector<HTMLElement>(`[data-comment-id="${id}"]`);
        if (!container || !element) return;
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const margin = 8;
        let delta = 0;
        if (elementRect.top < containerRect.top + margin || elementRect.height > containerRect.height - 2 * margin) {
            // Above the view, or taller than the view: align its top
            delta = elementRect.top - containerRect.top - margin;
        } else if (elementRect.bottom > containerRect.bottom - margin) {
            // Below the view (e.g. covered by the form): align its bottom
            delta = elementRect.bottom - containerRect.bottom + margin;
        }
        if (delta !== 0) {
            container.scrollBy({ top: delta, behavior });
        }
    };

    const handlePostAnswer = async () => {
        if (!userInfo) return;

        setAnswerFormLoading(true);

        const result = await sendJsonRequest<CreateCommentData>(`/${options.section}/CreateComment`, 'POST', {
            ...options.params,
            parentId: parentCommentId,
            message: answerFormMessage,
        });
        if (result.data) {
            const newPost: CommmentDetails = { ...result.data.post, index: -1, user: { ...userInfo }, isUpvoted: false };
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
            const result = await sendJsonRequest<EditCommentData>(`/${options.section}/EditComment`, "PUT", {
                message: answerFormMessage,
                id: editedComment.id
            });
            if (result.data) {
                if (editedComment.parentId) {
                    onEditCallback?.(result.data.id, prev => ({ ...prev, ...result.data }));
                } else {
                    editComment(result.data.id, prev => ({ ...prev, ...result.data }));
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

    const onReply = (parentId: string, target: CommmentDetails, replyCallback: (post: CommmentDetails) => void, message?: string) => {
        setOnReplyCallback(() => replyCallback);
        showAnswerForm(null, parentId, message, target);
    }

    const onEdit = (post: CommmentDetails, editCallback?: (id: string, setter: (prev: CommmentDetails) => CommmentDetails) => void) => {
        setOnEditCallback(() => editCallback);
        showAnswerForm(post, post.parentId, post.message);
    }

    const onDelete = (post: CommmentDetails, deleteCallback?: (id: string) => void) => {
        setOnDeleteCallback(() => deleteCallback);
        setEditedComment(post);
        setDeleteModalVisible(true);
    }

    const onVote = (id: string, vote: number, error?: { message: string }[]) => {
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

    // Comment the open form refers to (being edited or replied to)
    const formContextComment = answerFormVisible ? (editedComment ?? replyTarget) : null;
    const formContextCommentId = formContextComment?.id ?? null;

    // Keep the replied/edited comment visible: when the form opens, and whenever the list shrinks
    // afterwards (form growing, on-screen keyboard opening, window resize)
    useEffect(() => {
        const container = commentContainerRef.current;
        if (!formContextCommentId || !container) return;

        const frame = requestAnimationFrame(() => scrollToComment(formContextCommentId));

        let lastHeight = container.clientHeight;
        const observer = new ResizeObserver(() => {
            const height = container.clientHeight;
            if (height < lastHeight) {
                scrollToComment(formContextCommentId, "auto");
            }
            lastHeight = height;
        });
        observer.observe(container);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [formContextCommentId]);

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
            <PostAttachmentSelect show={postAttachmentSelectVisible} onClose={() => setPostAttachmentSelectVisible(false)} onSubmit={handlePostAttachments} />
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
            <div className="wb-comments-list-area">
            <div className="wb-comments-list pt-1 pe-1" ref={commentContainerRef}>
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
                            activeCommentId={formContextComment?.id ?? null}
                            onVote={onVote}
                        />)
                        return comment.id == parentCommentId ?
                            <div key={comment.id} ref={activeParentCommentRef}>{node}</div> :
                            <div key={comment.id}>{node}</div>
                    })
                }
            </div>
            <Toast
                className="wb-comments-toast"
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
            </div>
            <div className="wb-comments-form py-2 border-top">
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
                        {formContextComment ? (
                            <div className="wb-comments-form-context">
                                <button
                                    type="button"
                                    className="wb-comments-form-context-body"
                                    onClick={() => scrollToComment(formContextComment.id)}
                                    title="Show comment"
                                >
                                    {editedComment
                                        ? <>Editing your {editedComment.parentId ? "reply" : "comment"}</>
                                        : <>Replying to <b>{formContextComment.user.name}</b></>}
                                </button>
                            </div>
                        ) : (
                            <FormLabel className="d-none d-md-block mb-1">
                                <b>{userInfo?.name}</b>
                            </FormLabel>
                        )}
                        <PostTextareaControl
                            ref={formInputRef}
                            size="sm"
                            value={answerFormMessage}
                            setValue={setAnswerFormMessage}
                            placeholder={replyTarget ? `Reply to ${replyTarget.user.name}...` : "Write your comment here..."}
                            rows={4}
                        />
                    </FormGroup>
                    <div className="d-flex justify-content-end align-items-center mt-1">
                        <Button variant="link" className="text-secondary" onClick={() => setPostAttachmentSelectVisible(true)}>
                            <FaPlus />
                        </Button>
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