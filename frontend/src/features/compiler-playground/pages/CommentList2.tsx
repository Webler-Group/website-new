import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Button, Form, FormGroup, FormLabel, Modal, Toast } from "react-bootstrap";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";
import CommentNode, { IComment } from "../components/CommentNode";
import { FaLeftLong } from "react-icons/fa6";
import { useApi } from "../../../context/apiCommunication";
import { IPostAttachment } from "../../discuss/components/PostAttachment";
import PostTextareaControl from "../../../components/PostTextareaControl";

interface CommentListProps {
    options: { section: string; params: any; } | null;
    setCommentCount?: (callback: (data: number) => number) => void;
    findPost: { id: string; isReply: boolean; } | null;
    setFindPost: (value: { id: string; isReply: boolean; } | null) => void;
}

const CommentList2 = ({ options, setCommentCount, findPost, setFindPost }: CommentListProps) => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState(1);
    const commentContainerRef = useRef<HTMLDivElement>(null);
    const [answerFormVisible, setAnswerFormVisible] = useState(false);
    const [answerFormMessage, setAnswerFormMessage] = useState("");
    const [editedComment, setEditedComment] = useState<string | null>(null);
    const [parentComment, setParentComment] = useState<string | null>(null);
    const [onReplyCallback, setOnReplyCallback] = useState<(data: IComment) => void>();
    const [defaultOnReplyCallback, setDefaultOnReplyCallback] = useState<(data: IComment) => void>();
    const [onEditCallback, setOnEditCallback] = useState<(id: string, message: string, attachments: IPostAttachment[]) => void>();
    const [onDeleteCallback, setOnDeleteCallback] = useState<(id: string, answers: number) => void>();
    const [deletedAnswersCount, setDeletedAnswersCount] = useState(0);
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const formInputRef = useRef<HTMLTextAreaElement>(null);
    const [showAllComments, setShowAllComments] = useState(findPost == null || findPost.isReply == false);
    const activeParentPostRef = useRef<HTMLDivElement | null>(null);
    const [findPostId, setFindPostId] = useState<string | null>(null);

    const [message, setMessage] = useState([true, ""]);

    useEffect(() => {
        if (findPost) {
            setFilter(2);
            setFindPostId(findPost.id);
        }
        setShowAllComments(findPost == null || findPost.isReply == false);
    }, [findPost]);

    useEffect(() => {
        let timeoutId = setTimeout(() => {
            scrollToTop("instant");
        });
        return () => clearTimeout(timeoutId);
    }, [filter]);

    const showAnswerForm = (input: string, editedComment: string | null) => {
        setAnswerFormVisible(true);
        setAnswerFormMessage(input);
        setEditedComment(editedComment);
        setTimeout(() => {
            if (formInputRef.current) {
                formInputRef.current.focus();
            }
        })
    }

    const hideAnswerForm = () => {
        setAnswerFormVisible(false);
    }

    const handlePostAnswer = async () => {
        if (!options) return;
        if (!userInfo) {
            navigate("/Users/Login");
            return
        }
        setLoading(true);
        const result = await sendJsonRequest(`/${options.section}/CreateComment`, "POST", {
            message: answerFormMessage,
            ...options.params,
            parentId: parentComment
        });
        if (result && result.post) {
            if (parentComment) {
                onReplyCallback?.({ ...result.post, userName: userInfo.name, userAvatar: userInfo.avatarImage });
                setTimeout(() => {
                    if (activeParentPostRef.current) {
                        activeParentPostRef.current.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                    setParentComment(null);
                });
            }
            else {
                defaultOnReplyCallback?.({ ...result.post, userName: userInfo.name, userAvatar: userInfo.avatarImage });
                setTimeout(() => {
                    scrollToTop("smooth");
                });
            }
            setCommentCount?.(commentCount => commentCount + 1);
            hideAnswerForm();
            setMessage([true, "Comment successfully created"])
        }
        else {
            setMessage([false, result.message ? result.message : "Comment could not be created"])
        }
        setLoading(false);
    }

    const handleEditAnswer = async () => {
        if (!options) return;
        if (!userInfo) {
            navigate("/Users/Login");
            return
        }
        setLoading(true);
        const result = await sendJsonRequest(`/${options.section}/EditComment`, "PUT", {
            message: answerFormMessage,
            id: editedComment
        });
        if (result && result.success) {
            onEditCallback!(result.data.id, result.data.message, result.data.attachments);
            hideAnswerForm();
            setMessage([true, "Comment successfully updated"])
        }
        else {
            setMessage([false, result.message ? result.message : "Comment could not be updated"])
        }
        setLoading(false);
    }

    const handleDeleteComment = async () => {
        if (!options) return;
        setLoading(true);
        const result = await sendJsonRequest(`/${options.section}/DeleteComment`, "DELETE", { id: editedComment });
        if (result && result.success) {
            closeDeleteModal();
            hideAnswerForm();
            onDeleteCallback!(editedComment!, deletedAnswersCount)
            setCommentCount?.(commentCount => commentCount - 1 - deletedAnswersCount);
        }
        else {

        }
        setLoading(false);
    }

    const onReply = (parentId: string, callback: (data: IComment) => void) => {
        showAnswerForm("", null);
        setParentComment(parentId);
        setOnReplyCallback(() => callback);
    }

    const onEdit = (id: string, message: string, callback: (id: string, message: string, attachments: IPostAttachment[]) => void) => {
        showAnswerForm(message, id);
        setOnEditCallback(() => callback);
    }

    const onDelete = (id: string, callback: (id: string, answers: number) => void, answers: number) => {
        setEditedComment(id);
        setDeleteModalVisible(true);
        setOnDeleteCallback(() => callback);
        setDeletedAnswersCount(answers);
    }

    const closeDeleteModal = () => setDeleteModalVisible(false);

    const handleFilterSelect = (e: ChangeEvent) => {
        const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value)
        setFilter(value)
    }

    const handleBackToAllComments = () => {
        setFindPost(null)
        setShowAllComments(true)
    }

    const scrollToTop = (behavior: ScrollBehavior) => {
        if (commentContainerRef.current) {
            commentContainerRef.current.scrollTo({ top: 0, behavior });
        }
    };

    if (!options) return (<div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
        <div className="wb-loader">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>);

    return (
        <>
            <Modal size="sm" show={deleteModalVisiblie} onHide={closeDeleteModal} centered>
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
                {
                    showAllComments ?
                        <div className="col-6 col-sm-4">
                            <Form.Select size="sm" value={filter} onChange={handleFilterSelect}>
                                <option value="1">Most Popular</option>
                                <option value="2">Oldest</option>
                                <option value="3">Most recent</option>
                            </Form.Select>
                        </div>
                        :
                        <Button onClick={handleBackToAllComments} variant="link" size="sm">
                            <FaLeftLong />
                            Back to all comments
                        </Button>
                }
            </div>
            <div className="mt-1 pe-1 flex-grow-1 overflow-auto" ref={commentContainerRef}>
                <CommentNode
                    options={options}
                    data={null}
                    parentId={null}
                    filter={filter}
                    findPostId={findPostId}
                    findPostIsReply={findPost?.isReply ?? false}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onVote={() => { }}
                    setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                    addReplyToParent={() => { }}
                    editParentReply={() => { }}
                    deleteParentReply={() => { }}
                    showAllComments={showAllComments}
                    setShowAllComments={setShowAllComments}
                    defaultReplies={null}
                    activeParentPostId={parentComment}
                    activeParentPostRef={activeParentPostRef}
                />
            </div>
            <Toast className="position-absolute" style={{ zIndex: "999", bottom: "68px", width: "90%" }} bg={message[0] === false ? "danger" : "success"} onClose={() => setMessage([true, ""])} show={message[1] !== ""} delay={3000} autohide>
                <Toast.Body className="text-white">
                    <b>{message[1]}</b>
                </Toast.Body>
            </Toast>
            <div className="py-2 border-top">
                <Button hidden={answerFormVisible} size="sm" variant="primary" className="ms-2" onClick={() => showAnswerForm("", null)}>Write comment</Button>
                <div hidden={answerFormVisible === false}>
                    <FormGroup>
                        <FormLabel><b>{userInfo?.name}</b></FormLabel>
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
                        <Button size="sm" variant="secondary" className="ms-2" onClick={hideAnswerForm}>Cancel</Button>
                        {
                            editedComment === null ?
                                <>
                                    <Button size="sm" className="ms-2" variant="primary" onClick={handlePostAnswer} disabled={loading || answerFormMessage.length === 0}>Post</Button>
                                </>
                                :
                                <>
                                    <Button size="sm" variant="primary" className="ms-2" onClick={handleEditAnswer} disabled={loading || answerFormMessage.length === 0}>Save changes</Button>
                                </>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}

export default CommentList2;