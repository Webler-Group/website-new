import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Button, Form, FormGroup, FormLabel, Modal, Offcanvas, Toast } from "react-bootstrap";
import { ICode } from "../../codes/components/Code";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";
import CommentNode, { ICodeComment } from "../components/CommentNode";
import { FaLeftLong } from "react-icons/fa6";
import { useApi } from "../../../context/apiCommunication";
import { IPostAttachment } from "../../discuss/components/PostAttachment";
import PostTextareaControl from "../../../components/PostTextareaControl";

interface CommentListProps {
    code: ICode;
    visible: boolean;
    onHide: () => void;
    commentCount: number;
    setCommentCount: (callback: (data: number) => number) => void;
    postId: string | null;
    setPostId: (callback: (data: string | null) => string | null) => void;
    isReply: boolean;
}

const CommentList2 = ({ code, visible, onHide, commentCount, setCommentCount, postId, setPostId, isReply }: CommentListProps) => {
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
    const [onReplyCallback, setOnReplyCallback] = useState<(data: ICodeComment) => void>();
    const [defaultOnReplyCallback, setDefaultOnReplyCallback] = useState<(data: ICodeComment) => void>();
    const [onEditCallback, setOnEditCallback] = useState<(id: string, message: string, attachments: IPostAttachment[]) => void>();
    const [onDeleteCallback, setOnDeleteCallback] = useState<(id: string, answers: number) => void>();
    const [deletedAnswersCount, setDeletedAnswersCount] = useState(0);
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const formInputRef = useRef<HTMLTextAreaElement>(null);
    const [showAllComments, setShowAllComments] = useState(!(isReply && postId))

    const [message, setMessage] = useState([true, ""]);

    useEffect(() => {
        if (postId) {
            setFilter(2);
        }
    }, [postId]);


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
        setParentComment(null);
    }

    const handlePostAnswer = async () => {
        if (!code || !code.id) {
            return
        }
        if (!userInfo) {
            navigate("/Users/Login");
            return
        }
        setLoading(true);
        const result = await sendJsonRequest(`/Discussion/CreateCodeComment`, "POST", {
            message: answerFormMessage,
            codeId: code.id,
            parentId: parentComment
        });
        if (result && result.post) {
            if (parentComment) {
                onReplyCallback!({ ...result.post, userName: userInfo.name, userAvatar: userInfo.avatarImage });
            }
            else {
                defaultOnReplyCallback!({ ...result.post, userName: userInfo.name, userAvatar: userInfo.avatarImage });
            }
            setCommentCount(commentCount => commentCount + 1);
            hideAnswerForm();
            setMessage([true, "Comment successfully created"])
        }
        else {
            setMessage([false, result.message ? result.message : "Comment could not be created"])
        }
        setLoading(false);
    }

    const handleEditAnswer = async () => {
        if (!code || !code.id) {
            return
        }
        if (!userInfo) {
            navigate("/Users/Login");
            return
        }
        setLoading(true);
        const result = await sendJsonRequest(`/Discussion/EditCodeComment`, "PUT", {
            message: answerFormMessage,
            commentId: editedComment
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
        setLoading(true);
        const result = await sendJsonRequest("/Discussion/DeleteCodeComment", "DELETE", { commentId: editedComment });
        if (result && result.success) {
            closeDeleteModal();
            hideAnswerForm();
            onDeleteCallback!(editedComment!, deletedAnswersCount)
            setCommentCount(commentCount => commentCount - 1 - deletedAnswersCount);
        }
        else {

        }
        setLoading(false);
    }

    const onReply = (parentId: string, callback: (data: ICodeComment) => void) => {
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
        setPostId(() => null)
        setShowAllComments(true)
    }

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
            <Offcanvas show={visible} onHide={onHide} placement="end">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>{commentCount} Comments</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="d-flex flex-column" style={{ height: "calc(100% - 62px)" }}>
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
                            code={code}
                            data={null}
                            parentId={null}
                            filter={filter}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onVote={() => { }}
                            setDefaultOnReplyCallback={setDefaultOnReplyCallback}
                            addReplyToParent={() => { }}
                            editParentReply={() => { }}
                            deleteParentReply={() => { }}
                            activePostId={postId}
                            setActivePostId={setPostId}
                            showAllComments={showAllComments}
                            setShowAllComments={setShowAllComments}
                            isActivePostReply={isReply}
                            defaultReplies={null}
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
                </Offcanvas.Body>
            </Offcanvas>
        </>
    )
}

export default CommentList2;