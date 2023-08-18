import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import ApiCommunication from "../../../helpers/apiCommunication";
import { IQuestion } from "../components/Question";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import { Alert, Button, Form, FormControl, FormGroup, FormLabel, Modal } from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { useAuth } from "../../auth/context/authContext";
import Answer, { IAnswer } from "../components/Answer";
import { FaPencil } from "react-icons/fa6";
import { LinkContainer } from "react-router-bootstrap";
import { FaThumbsUp } from "react-icons/fa";


const DiscussPost = () => {
    const { questionId } = useParams();

    const navigate = useNavigate();
    const { userInfo } = useAuth();
    const [question, setQuestion] = useState<IQuestion | null>(null);
    const [message, setMessage] = useState(["", ""]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const answersPerPage = 10;
    const [answers, setAnswers] = useState<IAnswer[]>([]);
    const form = useRef<HTMLFormElement>(null);
    const [formVisible, setFormVisible] = useState(false);
    const [formInput, setFormInput] = useState("");
    const maxCharacters = 1000;
    const [acceptedAnswer, setAcceptedAnswer] = useState<string | null>(null);
    const [editedAnswer, setEditedAnswer] = useState<string | null>(null);
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const [filter, setFilter] = useState(1);
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.has("page")) {
            setCurrentPage(Number(searchParams.get("page")))
        }
        if (searchParams.has("filter")) {
            setFilter(Number(searchParams.get("filter")))
        }
    }, []);

    useEffect(() => {
        getQuestion();
    }, [questionId]);

    useEffect(() => {
        getAnswers();
    }, [currentPage, filter, questionId]);

    useEffect(() => {
        handlePageChange(1);
    }, [filter]);

    const handlePageChange = (page: number) => {
        searchParams.set("page", page.toString());
        setSearchParams(searchParams, { replace: true })
        setCurrentPage(page);
    }

    const handleFilterSelect = (e: ChangeEvent) => {
        const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value)
        searchParams.set("filter", value.toString())
        setSearchParams(searchParams, { replace: true })
        setFilter(value)
    }

    const getQuestion = async () => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Discussion/${questionId}`, "GET");
        if (result && result.question) {
            setQuestion(result.question)
        }
        setLoading(false);
    }

    const getAnswers = async () => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Discussion/${questionId}/GetReplies?page=${currentPage}&count=${answersPerPage}&filter=${filter}`, "GET");
        if (result && result.posts) {
            setAnswers(result.posts);
            let accepted = null;
            for (let i = 0; i < result.posts.length; ++i) {
                if (result.posts[i].isAccepted) {
                    accepted = result.posts[i].id;
                    break;
                }
            }

            setAcceptedAnswer(accepted);
        }
        setLoading(false);
    }

    const handlePostAnswer = async () => {
        if (!userInfo) {
            navigate("/Login");
            return
        }
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Discussion/CreateReply`, "POST", {
            message: formInput,
            questionId
        });
        if (result && result.post) {
            setAnswers(answers => [{ ...result.post, userName: userInfo.name }, ...answers]);
            setQuestion(question => {
                if (question) {
                    return { ...question, answers: question.answers + 1 }
                }
                return null
            })
            hideAnswerForm();
            setMessage(["success", "Your answer was posted successfully"])
        }
        else {
            setMessage(["danger", result.error ? result.error.message : result.message]);
        }
        setLoading(false);
    }

    const handleEditAnswer = async () => {
        if (!userInfo) {
            navigate("/Login");
            return
        }
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Discussion/EditReply`, "PUT", {
            message: formInput,
            replyId: editedAnswer
        });
        if (result && result.success) {
            setAnswers(answers => {
                const currentAnswers = [...answers];
                for (let i = 0; i < currentAnswers.length; ++i) {
                    if (currentAnswers[i].id === editedAnswer) {
                        currentAnswers[i].message = result.data.message;
                    }
                }
                return currentAnswers;
            });
            hideAnswerForm();
            setMessage(["success", "Your answer was updated successfully"]);
        }
        else {
            setMessage(["danger", result.error ? result.error.message : result.message]);
        }
        setLoading(false);
    }

    const showAnswerForm = (input: string, editedAnswer: string | null) => {
        if (userInfo) {
            setMessage(["", ""]);
            setFormVisible(true);
            setFormInput(input);
            setEditedAnswer(editedAnswer);
            setTimeout(() => {
                if (form.current) {
                    form.current.scrollIntoView({ behavior: "smooth" });
                }
            })
        }
        else {
            navigate("/Login");
        }
    }

    const hideAnswerForm = () => {
        setFormVisible(false);
        setFormInput("");
    }

    const toggleAcceptedAnswer = async (postId: string) => {
        const result = await ApiCommunication.sendJsonRequest("/Discussion/ToggleAcceptedAnswer", "POST", {
            postId,
            accepted: !(postId === acceptedAnswer)
        });
        if (result && result.success) {
            setAcceptedAnswer(postId === acceptedAnswer ? null : postId);
        }
    }

    const showEditAnswer = (postId: string) => {
        const answer = answers.find(x => x.id == postId);
        if (answer) {
            showAnswerForm(answer.message, postId);
        }
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const handleDeletePost = async () => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest("/Discussion/DeleteReply", "DELETE", { replyId: editedAnswer });
        if (result && result.success) {
            closeDeleteModal();
            hideAnswerForm();
            setAnswers(answers => {
                return answers.filter(x => x.id !== editedAnswer);
            });
            setQuestion(question => {
                if (question) {
                    return { ...question, answers: question.answers - 1 }
                }
                return null
            })
        }
        else {
            setMessage(["danger", result.error ? result.error._message : result.message]);
        }
        setLoading(false);
    }

    const voteQuestion = async () => {
        if (!question) {
            return
        }
        const vote = question.isUpvoted ? 0 : 1;
        const result = await ApiCommunication.sendJsonRequest("/Discussion/VotePost", "POST", { postId: questionId, vote });
        if (result.vote === vote) {
            setQuestion(question => {
                if (question) {
                    return { ...question, votes: question.votes + (vote ? 1 : -1), isUpvoted: vote === 1 }
                }
                return null
            });
        }
    }

    let charactersRemaining = maxCharacters - formInput.length;

    return (
        question !== null &&
        <>
            <Modal show={deleteModalVisiblie} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Your answer will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeletePost}>Delete</Button>
                </Modal.Footer>
            </Modal>
            <div className="p-2 bg-white rounded border mb-3 position-relative">
                {
                    (question && question.userId === userInfo?.id) &&
                    <LinkContainer to={"/Discuss/Edit/" + questionId}>
                        <span className="wb-discuss-reply__edit-button">
                            <FaPencil />
                        </span>
                    </LinkContainer>
                }
                <div className="d-flex">
                    <div>
                        <div className="wb-discuss-voting">
                            <span onClick={voteQuestion} className={"wb-discuss-voting__button" + (question.isUpvoted ? " text-black" : "")}>
                                <FaThumbsUp />
                            </span>
                            <b>{question.votes}</b>
                        </div>
                    </div>
                    <div className="wb-discuss-question__main ms-2">
                        <h3>{question.title}</h3>
                        <p className="wb-discuss-question__description mt-4">{question.message}</p>
                        <div className="d-flex mt-4 flex-wrap">
                            {
                                question.tags.map((tag, idx) => {
                                    return (
                                        <small key={idx} className="rounded bg-light p-1 me-2 border">{tag}</small>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
                <div className="d-flex justify-content-end">
                    <div>
                        <div>
                            <small>{DateUtils.format(new Date(question.date))}</small>
                        </div>
                        <div className="d-flex justify-content-end">
                            <ProfileName userId={question.userId} userName={question.userName} />
                        </div>
                    </div>
                    <div className="ms-2 wb-p-follow-item__avatar">
                        <img className="wb-p-follow-item__avatar-image" src="/resources/images/user.svg" />
                    </div>
                </div>
            </div>
            {message[1] && <Alert variant={message[0]} onClose={() => setMessage(["", ""])} dismissible>{message[1]}</Alert>}
            <div hidden={!formVisible} className="mt-2 border bg-white rounded p-2">
                <Form ref={form}>
                    <FormGroup>
                        <FormLabel><b>{userInfo?.name}</b></FormLabel>
                        <FormControl as="textarea" rows={8} placeholder="Write your reply here..." required maxLength={1000} value={formInput} onChange={(e) => setFormInput(e.target.value)} />
                        <p className={charactersRemaining > 0 ? "text-secondary" : "text-danger"}>{charactersRemaining} characters remaining</p>
                    </FormGroup>
                    <div className="d-flex justify-content-end">
                        <Button variant="secondary" onClick={hideAnswerForm} disabled={loading}>Cancel</Button>
                        {
                            editedAnswer === null ?
                                <>
                                    <Button variant="primary" className="ms-2" onClick={handlePostAnswer} disabled={loading}>Post</Button>
                                </>
                                :
                                <>
                                    <Button variant="secondary" className="ms-2" onClick={() => setDeleteModalVisible(true)} disabled={loading}>Delete</Button>
                                    <Button variant="primary" className="ms-2" onClick={handleEditAnswer} disabled={loading}>Save changes</Button>
                                </>
                        }
                    </div>
                </Form>
            </div>
            <div className="d-flex justify-content-between mt-4">
                <div>
                    <h2>{question.answers} Answers</h2>
                </div>
                <div className="d-flex">
                    <Form.Select value={filter} onChange={handleFilterSelect}>
                        <option value="1">Sort by: Votes</option>
                        <option value="2">Sort by: Date</option>
                    </Form.Select>
                    <Button variant="primary" className="ms-2" onClick={() => showAnswerForm("", null)}>Answer</Button>
                </div>
            </div>
            <div className="mt-2">
                {
                    answers.map(answer => {
                        return (
                            <Answer
                                answer={answer}
                                acceptedAnswer={acceptedAnswer}
                                toggleAcceptedAnswer={toggleAcceptedAnswer}
                                isQuestionOwner={userInfo?.id === question.userId}
                                key={answer.id}
                                showEditAnswer={showEditAnswer} />
                        )
                    })
                }
            </div>
            <div>
                <PaginationControl
                    page={currentPage}
                    between={3}
                    total={question.answers}
                    limit={answersPerPage}
                    changePage={handlePageChange}
                    ellipsis={1}
                />
            </div>
        </>
    )
}

export default DiscussPost