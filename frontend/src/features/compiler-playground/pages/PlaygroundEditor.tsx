import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CodeEditor from "../components/CodeEditor";
import { ICode } from "../../codes/components/Code";
import ProfileName from "../../../components/ProfileName";
import { FaComment, FaThumbsUp } from "react-icons/fa6";
import { Button, Dropdown, FormControl, Modal } from "react-bootstrap";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import AuthNavigation from "../../auth/components/AuthNavigation";
import ApiCommunication from "../../../helpers/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import CommentList from "./CommentList";
import LoginForm from "../../auth/components/LoginForm";
import RegisterForm from "../../auth/components/RegisterForm";
import ToggleSwitch from "../../../components/ToggleSwitch";

interface PlaygroundEditorProps {
    language: string;
}

const PlaygroundEditor = ({ language }: PlaygroundEditorProps) => {
    const { codeId } = useParams();

    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const [code, setCode] = useState<ICode | null>(null);
    const [saveModalVisiblie, setSaveModalVisible] = useState(false);
    const [codeName, setCodeName] = useState("");
    const [codePublic, setCodePublic] = useState(false);
    const [source, setSource] = useState("");
    const [css, setCss] = useState("");
    const [js, setJs] = useState("");
    const [saveAsNew, setSaveAsNew] = useState(true);
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [commentModalVisible, setCommentModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [isUserRegistering, setUserAuthPage] = useState(true);

    const openCommentModal = () => {
        setCommentModalVisible(true)
    }

    const closeCommentModal = () => {
        setCommentModalVisible(false);
    }

    const openSaveModal = (saveAsNew: boolean) => {
        setSaveModalVisible(true)
        setSaveAsNew(saveAsNew);
    }

    const closeSaveModal = () => {
        setSaveModalVisible(false);
    }

    const closeDetailsModal = () => {
        setDetailsModalVisible(false)
    }

    const closeAuthModal = () => {
        setAuthModalVisible(false);
    }

    useEffect(() => {
        if (codeId) {
            getCode()
        }
        else {
            getCodeByTemplate()
        }
    }, [codeId])

    const getCode = async () => {
        const result = await ApiCommunication.sendJsonRequest(`/codes/${codeId}`, "GET");
        if (result && result.code) {
            setCode(result.code);
            setCodeName(result.code.name);
            setCodePublic(result.code.isPublic);
            setSource(result.code.source);
            setCss(result.code.cssSource);
            setJs(result.code.jsSource);
        }
    }

    const getCodeByTemplate = async () => {
        const result = await ApiCommunication.sendJsonRequest(`/codes/templates/${language}`, "GET");
        if (result && result.template) {
            const template = result.template;
            setCode({
                language,
                isUpvoted: false,
                comments: 0,
                votes: 0,
                isPublic: false
            });
            setSource(template.source);
            setCss(template.cssSource);
            setJs(template.jsSource);
        }
    }

    const editCode = async (isPublic: boolean) => {
        if (!code) {
            return
        }
        const result = await ApiCommunication.sendJsonRequest("/codes/EditCode", "PUT", {
            codeId: code.id,
            name: codeName,
            isPublic,
            source: source,
            cssSource: css,
            jsSource: js
        });
        return result;
    }

    const getCreditsHeaders = (language: string, username: string) => {
        const message = "Created by " + username;
        switch (language) {
            case "web": return [
                "<!-- " + message + " -->",
                "/* " + message + " */",
                "// " + message
            ]
            default:
                throw new Error("Unknown language");
        }
    }

    const saveCode = async () => {
        if (!code || !userInfo) {
            return
        }
        setLoading(true)
        closeSaveModal();
        if (saveAsNew) {
            let creditsHeaders: string[] = [];
            if (code.userId && code.userId !== userInfo.id) {
                creditsHeaders = getCreditsHeaders(code.language, code.userName!);
            }
            const result = await ApiCommunication.sendJsonRequest("/codes/CreateCode", "POST", {
                name: codeName,
                language: code.language,
                source: (creditsHeaders[0] ? creditsHeaders[0] + "\n" : "") + source,
                cssSource: (creditsHeaders[1] ? creditsHeaders[1] + "\n" : "") + css,
                jsSource: (creditsHeaders[2] ? creditsHeaders[2] + "\n" : "") + js
            });
            if (result && result.code) {
                navigate("/Compiler-Playground/" + result.code.id, { replace: true })
            }
            else {

            }
            setLoading(false)
        }
        else {
            const result = await editCode(code.isPublic);
            if (result && result.success) {
                setCode(code => ({ ...code, ...result.data }));

            }
            else {

            }
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!code) {
            return
        }
        if (!userInfo) {
            setAuthModalVisible(true)
            return
        }
        if (code.id && code.userId === userInfo.id) {
            setLoading(true)
            const result = await editCode(code.isPublic);
            if (result && result.success) {
                setCode(code => ({ ...code, ...result.data }));

            }
            else {

            }
            setLoading(false)
        }
        else {
            setCodeName("");
            openSaveModal(true)
        }
    }

    const handleSaveAs = () => {
        if (!userInfo) {
            setAuthModalVisible(true)
            return
        }
        setCodeName("");
        openSaveModal(true)
    }

    const handleRename = () => {
        if (!code) {
            return
        }
        setCodeName(code.name!);
        openSaveModal(false)
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const handleDeleteCode = async () => {
        if (!code) {
            return
        }
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest("/codes/DeleteCode", "DELETE", { codeId: code.id });
        if (result && result.success) {
            navigate("/Codes", { replace: true })
        }
        else {

        }
        setLoading(false);
    }

    const voteCode = async () => {
        if (!code) {
            return
        }
        if (!userInfo) {
            navigate("/Login");
            return;
        }
        const vote = code.isUpvoted ? 0 : 1;
        const result = await ApiCommunication.sendJsonRequest("/Codes/VoteCode", "POST", { codeId: code.id, vote });
        if (result.vote === vote) {
            setCode(code => {
                if (code) {
                    return { ...code, votes: code.votes + (vote ? 1 : -1), isUpvoted: vote === 1 }
                }
                return code
            });
        }
    }

    const toggleCodePublic = async (isPublic: boolean) => {
        setLoading(true)
        const result = await editCode(isPublic);
        if (result && result.success) {
            setCode(code => ({ ...code, ...result.data }));
            setCodePublic(result.data.isPublic);
        }
        else {

        }
        setLoading(false)
    }

    let lineCount = source.split("\n").length + css.split("\n").length + js.split("\n").length;
    let characterCount = source.length + css.length + js.length;

    return (
        <>
            <Modal show={authModalVisible} onHide={closeAuthModal} centered>
                <Modal.Header closeButton></Modal.Header>
                <Modal.Body>
                    {
                        isUserRegistering ?
                            <RegisterForm onToggleClick={() => setUserAuthPage(false)} onRegister={closeAuthModal} />
                            :
                            <LoginForm onToggleClick={() => setUserAuthPage(true)} onLogin={closeAuthModal} />
                    }
                </Modal.Body>
            </Modal>
            {
                (code && code.id) &&
                <>
                    <CommentList visible={commentModalVisible} onHide={closeCommentModal} code={code} />
                    <Modal show={detailsModalVisible} onHide={closeDetailsModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Code details</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <ul>
                                <li>Title: <i>{code.name}</i></li>
                                <li>Author: <i>{code.userName}</i></li>
                                <li>Creation Date: <i>{code.date?.split("T")[0]}</i></li>
                                <li>Line Count: <i>{lineCount}</i></li>
                                <li>Character Count: <i>{characterCount}</i></li>
                            </ul>
                        </Modal.Body>
                    </Modal>
                </>
            }
            <Modal show={deleteModalVisiblie} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Your code will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteCode}>Delete</Button>
                </Modal.Footer>
            </Modal>
            <Modal show={saveModalVisiblie} onHide={closeSaveModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Save code</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>How would you like to name your code?</p>
                    <FormControl className="mt-2" type="text" placeholder="Unnamed" value={codeName} onChange={(e) => setCodeName(e.target.value)} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeSaveModal}>Cancel</Button>
                    <Button variant="primary" onClick={saveCode} disabled={codeName.length === 0}>Save</Button>
                </Modal.Footer>
            </Modal>
            <div className="d-flex align-items-center justify-content-between p-2 border-bottom">
                <div>
                    <Link to="/">
                        <img src="/resources/images/logo.png" height="50px" width="150px" />
                    </Link>
                </div>
                <div>
                    <AuthNavigation />
                </div>
            </div>
            {
                code &&
                <div className="wb-playground-container">
                    <div className="d-flex align-items-center justify-content-between p-2" style={{ height: "60px" }}>
                        <div className="d-flex">
                            {
                                code.id &&
                                <>
                                    <div className="d-flex">
                                        <div className="ms-2 wb-p-follow-item__avatar">
                                            <img className="wb-p-follow-item__avatar-image" src="/resources/images/user.svg" />
                                        </div>
                                        <div>
                                            <div>
                                                <b>{code.name}</b>
                                            </div>
                                            <div className="d-flex justify-content-start small">
                                                <ProfileName userId={code.userId!} userName={code.userName!} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ms-2 wb-playground-voting">
                                        <span onClick={voteCode} className={"wb-discuss-voting__button" + (code.isUpvoted ? " text-black" : "")}>
                                            <FaThumbsUp />
                                        </span>
                                        <span>{code.votes}</span>
                                    </div>
                                    <div className="ms-2 wb-playground-comments">
                                        <span className="wb-playground-comments__button" onClick={openCommentModal}>
                                            <FaComment />
                                        </span>
                                        <span>{code.comments}</span>
                                    </div>
                                </>
                            }
                        </div>
                        <div>
                            <Dropdown>
                                <Dropdown.Toggle as={EllipsisDropdownToggle}></Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={handleSave}>Save</Dropdown.Item>
                                    <Dropdown.Item onClick={handleSaveAs}>Save As</Dropdown.Item>
                                    {
                                        userInfo &&
                                        <>
                                            {
                                                (code && code.id) &&
                                                <>
                                                    {
                                                        code.userId == userInfo.id &&
                                                        <>
                                                            <Dropdown.Item onClick={handleRename}>Rename</Dropdown.Item>
                                                            <Dropdown.Item onClick={() => setDeleteModalVisible(true)}>Delete</Dropdown.Item>
                                                            <Dropdown.ItemText className="d-flex gap-2 align-items-center">
                                                                <ToggleSwitch value={codePublic} onChange={(e) => toggleCodePublic((e.target as HTMLInputElement).checked)} />
                                                                <span>Public</span>
                                                            </Dropdown.ItemText>
                                                        </>
                                                    }
                                                </>
                                            }
                                        </>
                                    }
                                    {
                                        (code && code.id) &&
                                        <Dropdown.Item onClick={() => setDetailsModalVisible(true)}>Details</Dropdown.Item>
                                    }
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>
                    <CodeEditor
                        loading={loading}
                        code={code}
                        source={source}
                        setSource={(value: string) => setSource(value)}
                        css={css}
                        setCss={(value: string) => setCss(value)}
                        js={js}
                        setJs={(value: string) => setJs(value)}
                    />
                </div>
            }
        </>
    )
}

export default PlaygroundEditor