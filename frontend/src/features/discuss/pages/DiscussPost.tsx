import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { IQuestion } from "../components/Question";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import { Alert, Button, Dropdown, Form, FormControl, FormGroup, FormLabel, Modal } from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { useAuth } from "../../auth/context/authContext";
import Answer, { IAnswer } from "../components/Answer";
import { LinkContainer } from "react-router-bootstrap";
import { FaThumbsUp } from "react-icons/fa";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import { FaStar } from "react-icons/fa6";
import PostAttachment from "../components/PostAttachment";
import { useApi } from "../../../context/apiCommunication";
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import allowedUrls from "../../../data/discussAllowedUrls";

const DiscussPost = () => {
    const { sendJsonRequest } = useApi();
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
    const maxCharacters = 4096;
    const [acceptedAnswer, setAcceptedAnswer] = useState<string | null>(null);
    const [editedAnswer, setEditedAnswer] = useState<string | null>(null);
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const [filter, setFilter] = useState(1);
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const [postId, setPostId] = useState<string | null>(null);
    const findPostRef = useRef<HTMLDivElement>(null);
    const formInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (location.state && location.state.postId) {
            setPostId(location.state.postId)
            setFilter(2);
        }
    }, [location])

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
    }, [searchParams, questionId, postId]);

    useEffect(() => {
        handlePageChange(1);
    }, [filter]);

    const handlePageChange = (page: number) => {
        if (page === currentPage) {
            return
        }
        setPostId(null)
        searchParams.set("page", page.toString());
        setSearchParams(searchParams, { replace: true })
        setCurrentPage(page);
    }

    const handleFilterSelect = (e: ChangeEvent) => {
        const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value)
        searchParams.set("filter", value.toString())
        setSearchParams(searchParams, { replace: true })
        setFilter(value)
        setPostId(null)
    }

    const getQuestion = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Discussion/GetQuestion`, "POST", {
            questionId
        });
        if (result && result.question) {
            setQuestion(result.question)
        }
        setLoading(false);
    }

    const getAnswers = async () => {
        setLoading(true);
        const page = searchParams.has("page") ? Number(searchParams.get("page")) : 1;
        const filter = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
        const result = await sendJsonRequest(`/Discussion/GetQuestionReplies`, "POST", {
            questionId,
            index: (page - 1) * answersPerPage,
            count: answersPerPage,
            filter,
            findPostId: postId
        });
        if (result && result.posts) {
            setAnswers(result.posts);
            if (postId) {
                setCurrentPage(result.posts.length > 0 ? Math.floor(result.posts[0].index / answersPerPage) + 1 : 1);
                setTimeout(() => {
                    if (findPostRef.current) {
                        findPostRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
                    }
                });
            }
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
            navigate("/Users/Login");
            return
        }
        setLoading(true);
        const result = await sendJsonRequest(`/Discussion/CreateReply`, "POST", {
            message: formInput,
            questionId
        });
        if (result && result.post) {
            setAnswers(answers => [{ ...result.post, userName: userInfo.name, userAvatar: userInfo.avatarImage }, ...answers]);
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
            navigate("/Users/Login");
            return
        }
        setLoading(true);
        const result = await sendJsonRequest(`/Discussion/EditReply`, "PUT", {
            message: formInput,
            replyId: editedAnswer
        });
        if (result && result.success) {
            setAnswers(answers => {
                const currentAnswers = [...answers];
                for (let i = 0; i < currentAnswers.length; ++i) {
                    if (currentAnswers[i].id === editedAnswer) {
                        currentAnswers[i].message = result.data.message;
                        currentAnswers[i].attachments = result.data.attachments;
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
                    form.current.scrollIntoView({ behavior: "smooth", block: "end" });
                }
                if (formInputRef.current) {
                    formInputRef.current.focus();
                }
            })
        }
        else {
            navigate("/Users/Login");
        }
    }

    const hideAnswerForm = () => {
        setFormVisible(false);
        setFormInput("");
    }

    const toggleAcceptedAnswer = async (postId: string) => {
        const result = await sendJsonRequest("/Discussion/ToggleAcceptedAnswer", "POST", {
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
        const result = await sendJsonRequest("/Discussion/DeleteReply", "DELETE", { replyId: editedAnswer });
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
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        const vote = question.isUpvoted ? 0 : 1;
        const result = await sendJsonRequest("/Discussion/VotePost", "POST", { postId: questionId, vote });
        if (result.vote === vote) {
            setQuestion(question => {
                if (question) {
                    return { ...question, votes: question.votes + (vote ? 1 : -1), isUpvoted: vote === 1 }
                }
                return null
            });
        }
    }

    const handleFollowQuestion = async () => {
        if (!question) {
            return
        }
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        const isFollowed = question.isFollowed;
        const result = await sendJsonRequest(isFollowed ? "/Discussion/UnfollowQuestion" : "/Discussion/FollowQuestion", "POST", { postId: questionId });
        if (result && result.success) {
            setQuestion(question => {
                if (question) {
                    return { ...question, isFollowed: !isFollowed }
                }
                return null
            })
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
            <div className="d-flex gap-2 py-2">
                <Link to="/Discuss">Q&A</Link>
                <span>&rsaquo;</span>
                <span>{question.title.length > 20 ? question.title.slice(0, 20) + "..." : question.title}</span>
            </div>
            <div className="p-2 bg-white rounded border mb-3 d-flex flex-column position-relative">
                {
                    userInfo &&
                    <div className="wb-discuss-reply__edit-button">
                        <Dropdown drop="start">
                            <Dropdown.Toggle as={EllipsisDropdownToggle} />
                            <Dropdown.Menu>
                                {
                                    (question && question.userId === userInfo.id) &&
                                    <LinkContainer to={"/Discuss/Edit/" + questionId}>
                                        <Dropdown.Item>Edit</Dropdown.Item>
                                    </LinkContainer>
                                }
                                <Dropdown.Item onClick={handleFollowQuestion}>
                                    {
                                        question.isFollowed ?
                                            "Unfollow"
                                            :
                                            "Follow"
                                    }
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                }

                <div className="d-flex gap-2">
                    <div className="d-flex flex-column align-items-center">
                        <div className="wb-discuss-voting">
                            <span onClick={voteQuestion} className={"wb-discuss-voting__button" + (question.isUpvoted ? " text-black" : "")}>
                                <FaThumbsUp />
                            </span>
                            <b>{question.votes}</b>
                        </div>
                        <div>
                            <span className={question.isFollowed ? "text-warning" : "text-secondary"}>
                                <FaStar />
                            </span>
                        </div>
                    </div>

                    <div className="flex-grow-1 d-flex flex-column gap-2" style={{ minWidth: "0" }}>
                        <h3 className="wb-discuss-question__title">{question.title}</h3>
                        <div className="mt-1 wb-discuss-question__description">
                            <MarkdownRenderer content={question.message} allowedUrls={allowedUrls} />
                        </div>
                        <div className="mt-1">
                            {
                                question.attachments.map(attachment => {
                                    return (
                                        <div key={attachment.id} className="mt-1">
                                            <PostAttachment data={attachment} />
                                        </div>
                                    )
                                })
                            }
                        </div>
                        <div className="d-flex mt-4 flex-wrap gap-1">
                            {
                                question.tags.map((tag, idx) => {
                                    return (
                                        <small key={idx} className="rounded bg-light p-1 border">{tag}</small>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
                <div className="d-flex justify-content-end mt-2 align-items-center gap-2">
                    <div>
                        <div>
                            <small>{DateUtils.format(new Date(question.date))}</small>
                        </div>
                        <div className="d-flex justify-content-end">
                            <ProfileName userId={question.userId} userName={question.userName} />
                        </div>
                    </div>
                    <ProfileAvatar size={32} avatarImage={question.userAvatar} />
                </div>
            </div>
            {message[1] && <Alert variant={message[0]} onClose={() => setMessage(["", ""])} dismissible>{message[1]}</Alert>}
            <div hidden={!formVisible} className="mt-2 border bg-white rounded p-2">
                <Form ref={form}>
                    <FormGroup>
                        <FormLabel><b>{userInfo?.name}</b></FormLabel>
                        <FormControl ref={formInputRef} as="textarea" rows={8} placeholder="Write your reply here..." required maxLength={maxCharacters} value={formInput} onChange={(e) => setFormInput(e.target.value)} />
                        <p className={charactersRemaining > 0 ? "text-secondary" : "text-danger"}>{charactersRemaining} characters remaining</p>
                    </FormGroup>
                    <div className="d-flex justify-content-end">
                        <Button size="sm" variant="secondary" onClick={hideAnswerForm} disabled={loading}>Cancel</Button>
                        {
                            editedAnswer === null ?
                                <>
                                    <Button size="sm" variant="primary" className="ms-2" onClick={handlePostAnswer} disabled={loading || formInput.length === 0}>Post</Button>
                                </>
                                :
                                <>
                                    <Button size="sm" variant="secondary" className="ms-2" onClick={() => setDeleteModalVisible(true)} disabled={loading}>Delete</Button>
                                    <Button size="sm" variant="primary" className="ms-2" onClick={handleEditAnswer} disabled={loading}>Save</Button>
                                </>
                        }
                    </div>
                </Form>
            </div>
            <div className="d-flex">
                <h4>{question.answers} Answers</h4>
            </div>
            <div className="d-flex justify-content-between">
                <Form.Select size="sm" style={{ width: "140px" }} value={filter} onChange={handleFilterSelect}>
                    <option value="1">Sort by: Votes</option>
                    <option value="2">Sort by: Date</option>
                </Form.Select>
                <Button size="sm" variant="primary" className="ms-2" onClick={() => showAnswerForm("", null)}>Answer</Button>
            </div>
            <div className="mt-2 d-flex flex-column w-100">
                {
                    answers.map(answer => {
                        if (postId === answer.id) {
                            return <Answer
                                ref={findPostRef}
                                answer={answer}
                                acceptedAnswer={acceptedAnswer}
                                toggleAcceptedAnswer={toggleAcceptedAnswer}
                                isQuestionOwner={userInfo?.id === question.userId}
                                key={answer.id}
                                showEditAnswer={showEditAnswer}
                                newlyCreatedAnswer={postId} />
                        }
                        return <Answer
                            answer={answer}
                            acceptedAnswer={acceptedAnswer}
                            toggleAcceptedAnswer={toggleAcceptedAnswer}
                            isQuestionOwner={userInfo?.id === question!.userId}
                            key={answer.id}
                            showEditAnswer={showEditAnswer}
                            newlyCreatedAnswer={postId} />
                    })
                }
            </div>
            <div className="my-3">
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