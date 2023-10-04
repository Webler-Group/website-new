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

const CommentList2 = ({ code, visible, onHide }: CommentListProps) => {

    const { userInfo } = useAuth();
    const [commentCount, setCommentCount] = useState(code.comments);
    const [filter, setFilter] = useState(1);
    const commentContainerRef = useRef<HTMLDivElement>(null);
    const [answerFormVisible, setAnswerFormVisible] = useState(false);
    const [answerFormMessage, setAnswerFormMessage] = useState("");
    const [editedComment, setEditedComment] = useState<string | null>(null);

    const showAnswerForm = (input: string, editedComment: string | null) => {
        setAnswerFormVisible(true);
        setAnswerFormMessage(input);
        setEditedComment(editedComment);
    }

    const hideAnswerForm = () => {
        setAnswerFormVisible(false);
    }

    const handlePostAnswer = () => {

    }

    const handleEditAnswer = () => {

    }

    return (
        <>
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
                        { /* TODO: Root comment component */}
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

export default CommentList2;