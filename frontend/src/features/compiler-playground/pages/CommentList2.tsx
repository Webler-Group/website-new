import { useRef, useState } from "react";
import { Button, Form, FormControl, FormGroup, FormLabel, Modal, Offcanvas } from "react-bootstrap";
import ApiCommunication from "../../../helpers/apiCommunication";
import { ICode } from "../../codes/components/Code";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";
import CommentNode, { ICodeComment } from "../components/CommentNode";

interface CommentListProps {
    code: ICode;
    visible: boolean;
    onHide: () => void;
    commentCount: number;
    setCommentCount: (callback: (data: number) => number) => void;
}

const CommentList2 = ({ code, visible, onHide, commentCount, setCommentCount }: CommentListProps) => {

    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const [_, setLoading] = useState(false)
    const [filter, setFilter] = useState(1);
    const commentContainerRef = useRef<HTMLDivElement>(null);
    const [answerFormVisible, setAnswerFormVisible] = useState(false);
    const [answerFormMessage, setAnswerFormMessage] = useState("");
    const [editedComment, setEditedComment] = useState<string | null>(null);
    const [parentComment, setParentComment] = useState<string | null>(null);
    const [onReplyCallback, setOnReplyCallback] = useState<(data: ICodeComment) => void>();
    const [defaultOnReplyCallback, setDefaultOnReplyCallback] = useState<(data: ICodeComment) => void>();
    const [onEditCallback, setOnEditCallback] = useState<(id: string, message: string) => void>();
    const [onDeleteCallback, setOnDeleteCallback] = useState<(id: string) => void>();
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);

    const showAnswerForm = (input: string, editedComment: string | null) => {
        setAnswerFormVisible(true);
        setAnswerFormMessage(input);
        setEditedComment(editedComment);
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
            }
            else {
                defaultOnReplyCallback!({ ...result.post, userName: userInfo.name });
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
            onDeleteCallback!(editedComment!)
            setCommentCount(commentCount => commentCount - 1);
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

    const onEdit = (id: string, message: string, callback: (id: string, message: string) => void) => {
        showAnswerForm(message, id);
        setOnEditCallback(() => callback);
    }

    const onDelete = (id: string, callback: (id: string) => void) => {
        setEditedComment(id);
        setDeleteModalVisible(true);
        setOnDeleteCallback(() => callback);
    }

    const closeDeleteModal = () => setDeleteModalVisible(false);

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
                        <div className="col-6 col-sm-4">
                            <Form.Select size="sm" value={filter} onChange={(e) => setFilter(Number(e.target.selectedOptions[0].value))}>
                                <option value="1">Most Popular</option>
                                <option value="2">Oldest</option>
                                <option value="3">Most recent</option>
                            </Form.Select>
                        </div>
                    </div>
                    <div className="mt-2 pe-3 flex-grow-1 overflow-auto" ref={commentContainerRef}>
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
                        />
                    </div>
                    <div className="py-2 border-top">
                        <Button hidden={answerFormVisible} size="sm" variant="primary" className="ms-2" onClick={() => showAnswerForm("", null)}>Write comment</Button>
                        <div hidden={answerFormVisible === false}>
                            <FormGroup>
                                <FormLabel><b>{userInfo?.name}</b></FormLabel>
                                <FormControl size="sm" value={answerFormMessage} onChange={(e) => setAnswerFormMessage(e.target.value)} as="textarea" rows={3} placeholder="Write your comment here..." />
                            </FormGroup>
                            <div className="d-flex justify-content-end mt-2">
                                <Button size="sm" variant="secondary" className="ms-2" onClick={hideAnswerForm}>Cancel</Button>
                                {
                                    editedComment === null ?
                                        <>
                                            <Button size="sm" className="ms-2" variant="primary" onClick={handlePostAnswer}>Post</Button>
                                        </>
                                        :
                                        <>
                                            <Button size="sm" variant="primary" className="ms-2" onClick={handleEditAnswer}>Save changes</Button>
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