import { useEffect, useRef, useState } from "react";
import { Button, Form, FormControl, FormGroup, FormLabel, Modal } from "react-bootstrap";
import CodeComment, { ICodeComment } from "../components/CodeComment";
import ApiCommunication from "../../../helpers/apiCommunication";
import { ICode } from "../../codes/components/Code";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";

interface CommentListProps {
    code: ICode;
    visible: boolean;
    onHide: () => void;
}

const CommentList = ({ code, visible, onHide }: CommentListProps) => {

    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const commentsPerPage = 20;
    const [comments, setComments] = useState<ICodeComment[]>([]);
    const [filter, setFilter] = useState(1);
    const [answerFormVisible, setAnswerFormVisible] = useState(false);
    const [answerFormMessage, setAnswerFormMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [parentComment, setParentComment] = useState<string | null>(null);
    const [onReplyCallback, setOnReplyCallback] = useState<(data: ICodeComment) => void>();
    const [commentCount, setCommentCount] = useState(code.comments);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const [activeComment, setActiveComment] = useState<string | null>(null);
    const [editedComment, setEditedComment] = useState<string | null>(null);
    const [onEditCallback, setOnEditCallback] = useState<(id: string, message: string) => void>();
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const commentContainerRef = useRef<HTMLDivElement>(null);
    const [onDeleteCallback, setOnDeleteCallback] = useState<(id: string) => void>();

    useEffect(() => {
        getComments(true);
        setCommentsLoaded(false);
    }, [filter])

    const getComments = async (replace: boolean) => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Discussion/GetCodeComments`, "POST", {
            codeId: code.id,
            parentId: null,
            page: replace ? 1 : Math.ceil(comments.length / commentsPerPage) + 1,
            filter,
            count: commentsPerPage
        });
        if (result && result.posts) {
            if (result.posts.length < commentsPerPage) {
                setCommentsLoaded(true);
            }

            if (replace) {
                setComments(() => [...result.posts]);
            }
            else {
                setComments(comments => [...comments, ...result.posts]);
            }
        }
        setLoading(false);
    }

    const handlePostAnswer = async () => {
        if (!code || !code.id) {
            return
        }
        if (!userInfo) {
            navigate("/Login");
            return
        }
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Discussion/CreateCodeComment`, "POST", {
            message: answerFormMessage,
            codeId: code.id,
            parentId: parentComment
        });
        if (result && result.post) {
            if (parentComment) {
                onReplyCallback!({ ...result.post, userName: userInfo.name });
                setComments(answers => {
                    const currentAnswers = [...answers];
                    for (let i = 0; i < currentAnswers.length; ++i) {
                        if (currentAnswers[i].id === parentComment) {
                            currentAnswers[i].answers += 1;
                        }
                    }
                    return currentAnswers;
                });
            }
            else {
                setComments(answers => [{ ...result.post, userName: userInfo.name }, ...answers]);
                if (commentContainerRef && commentContainerRef.current) {
                    commentContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
                }
            }
            setCommentCount(commentCount => commentCount + 1);
            hideAnswerForm();
        }
        else {

        }
        setLoading(false);
    }

    const handleEditAnswer = async () => {
        if (!code || !code.id) {
            return
        }
        if (!userInfo) {
            navigate("/Login");
            return
        }
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Discussion/EditCodeComment`, "PUT", {
            message: answerFormMessage,
            commentId: editedComment
        });
        if (result && result.success) {
            onEditCallback!(result.data.id, result.data.message);
            hideAnswerForm();
        }
        else {

        }
        setLoading(false);
    }

    const handleDeleteComment = async () => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest("/Discussion/DeleteCodeComment", "DELETE", { commentId: editedComment });
        if (result && result.success) {
            closeDeleteModal();
            hideAnswerForm();
            if (parentComment) {
                onDeleteCallback!(editedComment!);
            }
            else {
                const deletedComment = comments.find(x => x.id === editedComment);
                setComments(answers => {
                    return answers.filter(x => x.id !== editedComment);
                });
                setCommentCount(commentCount => commentCount - 1 - (deletedComment ? deletedComment.answers : 0));
            }
        }
        else {

        }
        setLoading(false);
    }

    const nextPage = () => {
        getComments(false);
    }

    const showAnswerForm = (input: string, editedComment: string | null) => {
        setAnswerFormVisible(true);
        setAnswerFormMessage(input);
        setEditedComment(editedComment);
    }

    const hideAnswerForm = () => {
        setParentComment(null)
        setActiveComment(null);
        setAnswerFormVisible(false);
    }

    const onReply = (id: string, parentId: string, callback: (data: ICodeComment) => void) => {
        setActiveComment(id);
        showAnswerForm("", null);
        setParentComment(parentId);
        setOnReplyCallback(() => callback);
    }

    const onEdit = (id: string, parentId: string | null, message: string, callback: (id: string, message: string) => void) => {
        setActiveComment(id);
        setParentComment(parentId);
        showAnswerForm(message, id);
        setOnEditCallback(() => callback);
    }

    const editReply = (id: string, message: string) => {
        setComments(answers => {
            const currentAnswers = [...answers];
            for (let i = 0; i < currentAnswers.length; ++i) {
                if (currentAnswers[i].id === id) {
                    currentAnswers[i].message = message;
                }
            }
            return currentAnswers;
        });
    }

    const onDelete = (id: string, parentId: string | null, callback: (id: string) => void) => {
        setActiveComment(null);
        setEditedComment(id);
        setDeleteModalVisible(true);
        setParentComment(parentId);
        setOnDeleteCallback(() => callback);
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const onVote = (id: string, vote: number) => {
        setComments(answers => {
            const currentAnswers = [...answers];
            for (let i = 0; i < currentAnswers.length; ++i) {
                if (currentAnswers[i].id === id) {
                    currentAnswers[i].isUpvoted = vote === 1;
                    currentAnswers[i].votes += vote ? 1 : -1;
                }
            }
            return currentAnswers;
        });
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
            <Modal show={visible} onHide={onHide} centered fullscreen="sm-down" contentClassName="wb-modal__container comments">
                <Modal.Header closeButton>
                    <Modal.Title>{commentCount} Comments</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex flex-column" style={{ height: "calc(100% - 62px)" }}>
                    <div className="d-flex justify-content-between">
                        <div className="col-6 col-sm-4">
                            <Form.Select value={filter} onChange={(e) => setFilter(Number(e.target.selectedOptions[0].value))}>
                                <option value="1">Most Popular</option>
                                <option value="2">Oldest</option>
                                <option value="3">Most recent</option>
                            </Form.Select>
                        </div>
                    </div>
                    <div className="mt-2 flex-grow-1 overflow-auto" ref={commentContainerRef}>
                        {
                            comments.map((item, idx) => {
                                return (
                                    <CodeComment code={code} key={idx} data={item} parentId={null} onReply={onReply} addReplyToParent={() => { }} editParentReply={editReply} activeComment={activeComment} onEdit={onEdit} onDelete={onDelete} deleteReplyFromParent={() => { }} onVote={onVote} />
                                )
                            })
                        }
                        {
                            commentsLoaded === false &&
                            <div>
                                <Button disabled={loading} onClick={nextPage} variant="link">Load more</Button>
                            </div>
                        }
                    </div>
                    <div className="py-2 border-top">
                        <Button hidden={answerFormVisible} variant="primary" className="ms-2" onClick={() => showAnswerForm("", null)}>Write comment</Button>
                        <div hidden={answerFormVisible === false}>
                            <FormGroup>
                                <FormLabel><b>{userInfo?.name}</b></FormLabel>
                                <FormControl value={answerFormMessage} onChange={(e) => setAnswerFormMessage(e.target.value)} as="textarea" rows={3} placeholder="Write your comment here..." />
                            </FormGroup>
                            <div className="d-flex justify-content-end mt-2">
                                <Button variant="secondary" className="ms-2" onClick={hideAnswerForm}>Cancel</Button>
                                {
                                    editedComment === null ?
                                        <>
                                            <Button className="ms-2" variant="primary" onClick={handlePostAnswer}>Post</Button>
                                        </>
                                        :
                                        <>
                                            <Button variant="primary" className="ms-2" onClick={handleEditAnswer}>Save changes</Button>
                                        </>
                                }
                            </div>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    )
}

export default CommentList;