import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import CodeEditor from "../components/CodeEditor";
import { ICode } from "../../codes/components/Code";
import ProfileName from "../../../components/ProfileName";
import { FaArrowLeft, FaComment, FaLock, FaTerminal, FaThumbsUp } from "react-icons/fa6";
import { Button, Dropdown, FormControl, Modal, Offcanvas, Toast } from "react-bootstrap";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import AuthNavigation from "../../auth/components/AuthNavigation";
import { useAuth } from "../../auth/context/authContext";
import LoginForm from "../../auth/components/LoginForm";
import RegisterForm from "../../auth/components/RegisterForm";
import ToggleSwitch from "../../../components/ToggleSwitch";
import { useApi } from "../../../context/apiCommunication";
import DateUtils from "../../../utils/DateUtils";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { truncate } from "../../../utils/StringUtils";
import PageTitle from "../../../layouts/PageTitle";
import { compilerLanguages, languagesInfo } from "../../../data/compilerLanguages";
import CommentList from "../../../components/comments/CommentList";
import ReactionsList from "../../../components/reactions/ReactionsList";

const scaleValues = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0]

interface PlaygroundEditorProps {
    language: compilerLanguages | null;
}

const PlaygroundEditor = ({ language }: PlaygroundEditorProps) => {
    const { sendJsonRequest } = useApi();
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
    const [editorOptions, setEditorOptions] = useState<any>({ scale: 1.0 });
    const [commentCount, setCommentCount] = useState(0);
    const [findPost, setFindPost] = useState<any | null>(null);
    const [commentListOptions, setCommentListOptions] = useState({ section: "Codes", params: { codeId } });
    const location = useLocation();
    const [message, setMessage] = useState<{ success: boolean; message?: string; errors?: any[]; }>({ success: true });
    const [pageTitle, setPageTitle] = useState("");
    const [codeVotesModalVisible, setCodeVotesModalVisible] = useState(false);
    const [codeVotesModalOptions, setCodeVotesModalOptions] = useState({ parentId: "" });
    const [consoleVisible, setConsoleVisible] = useState(false);
    const [historyCounter, setHistoryCounter] = useState(0);

    PageTitle(pageTitle);

    useEffect(() => {
        if (code) {
            setPageTitle(languagesInfo[code.language].displayName + " Playground - " + code.name + " | Webler Codes");
        } else if (language) {
            setPageTitle(languagesInfo[language].displayName + " Playground | Webler Codes");
        }
    }, [language, code]);

    useEffect(() => {
        if (location.state && location.state.postId) {
            openCommentModal();
            setFindPost({ id: location.state.postId, isReply: location.state.isReply });

        } else {
            closeCommentModal();
        }
    }, [location]);

    useEffect(() => {
        if (codeId) {
            getCode();
            setCommentListOptions({ section: "Codes", params: { codeId } });
        }
        else {
            getCodeByTemplate();
        }
        setHistoryCounter(1);
    }, [codeId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.userAgent.includes('Mac');
            const isSaveShortcut = (isMac && e.metaKey && e.key === 's') || (!isMac && e.ctrlKey && e.key === 's');

            if (isSaveShortcut) {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [code, userInfo, source, css, js]);


    useEffect(() => {
        let editorValue = localStorage.getItem("editor");
        if (editorValue !== null) {
            setEditorOptions(JSON.parse(editorValue));
        }
    }, []);

    useEffect(() => {
        setHistoryCounter(prev => prev + 1);
    }, [location]);

    const updateEditorOptions = (options: any) => {
        setEditorOptions(options);
        localStorage.setItem("editor", JSON.stringify(options));
    }

    const zoomIn = () => {
        let currentIdx = scaleValues.indexOf(editorOptions.scale);
        const scale = currentIdx === -1 ? 1.0 : scaleValues[Math.min(currentIdx + 1, scaleValues.length - 1)];
        updateEditorOptions({ ...editorOptions, scale })
    }

    const zoomOut = () => {
        let currentIdx = scaleValues.indexOf(editorOptions.scale);
        const scale = currentIdx === -1 ? 1.0 : scaleValues[Math.max(currentIdx - 1, 0)];
        updateEditorOptions({ ...editorOptions, scale })
    }

    const openCommentModal = () => {
        if (!codeId) return;
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

    const getCode = async () => {
        const result = await sendJsonRequest(`/codes/GetCode`, "POST", {
            codeId
        });
        if (result && result.code) {
            setCode(result.code);
            setCodeName(result.code.name);
            setCodePublic(result.code.isPublic);
            setSource(result.code.source);
            setCss(result.code.cssSource);
            setJs(result.code.jsSource);
            setCommentCount(result.code.comments);
        } else {
            navigate("/PageNotFound")
        }
    }

    const getCodeByTemplate = async () => {
        const result = await sendJsonRequest(`/codes/templates/${language}`, "POST");
        if (result && result.template) {
            const template = result.template;
            setCode({
                language: language as compilerLanguages,
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
        const result = await sendJsonRequest("/codes/EditCode", "PUT", {
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
            ];
            case "c": case "cpp": return [
                "// " + message
            ];
            case "python": case "ruby": return [
                "# " + message
            ];
            case "lua": return [
                "-- " + message
            ]
            default:
                return [""];
        }
    }

    const saveCode = async () => {
        if (!code || !userInfo) {
            return;
        }
        setLoading(true)
        if (saveAsNew) {
            let creditsHeaders: string[] = [];
            if (code.userId && code.userId !== userInfo.id) {
                creditsHeaders = getCreditsHeaders(code.language, code.userName!);
            }
            const result = await sendJsonRequest("/codes/CreateCode", "POST", {
                name: codeName,
                language: code.language,
                source: (creditsHeaders[0] ? creditsHeaders[0] + "\n" : "") + source,
                cssSource: (creditsHeaders[1] ? creditsHeaders[1] + "\n" : "") + css,
                jsSource: (creditsHeaders[2] ? creditsHeaders[2] + "\n" : "") + js
            });
            if (result && result.code) {
                closeSaveModal();
                navigate("/Compiler-Playground/" + result.code.id, { replace: code.userId === undefined })
            }
            else {
                setMessage({ success: false, errors: result?.error });
            }
            setLoading(false)
        }
        else {
            const result = await editCode(code.isPublic);
            if (result && result.success) {
                setCode(code => ({ ...code, ...result.data }));
                closeSaveModal();
                setMessage({ success: true, message: "Code updated successfully" });
            }
            else {
                setMessage({ success: false, errors: result?.error });
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

                setMessage({ success: true, message: "Code updated successfully" });
            }
            else {
                setMessage({ success: false, errors: result?.error });
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

    const closeVotesModal = () => {
        setCodeVotesModalVisible(false);
    }

    const showCodeVotesModal = (id: string | null) => {
        if (!id) return;
        setCodeVotesModalOptions({ parentId: id });
        setCodeVotesModalVisible(true);
    }

    const handleDeleteCode = async () => {
        if (!code) {
            return
        }
        setLoading(true);
        const result = await sendJsonRequest("/codes/DeleteCode", "DELETE", { codeId: code.id });
        if (result && result.success) {
            navigate("/Codes?filter=3", { replace: true })
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
            navigate("/Users/Login");
            return;
        }
        const vote = code.isUpvoted ? 0 : 1;
        const result = await sendJsonRequest("/Codes/VoteCode", "POST", { codeId: code.id, vote });
        if (result.vote === vote) {
            setCode(code => {
                if (code) {
                    return { ...code, votes: code.votes + (vote ? 1 : -1), isUpvoted: vote === 1 }
                }
                return code
            });
        }
        else {
            setMessage({ success: false, errors: result?.error });
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
            setMessage({ success: false, errors: result?.error });
        }
        setLoading(false)
    }

    const goBack = () => {
        if(historyCounter > 0) {
            navigate(-historyCounter);
        } else {
            navigate("/");
        }
    };

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
                    <Offcanvas show={commentModalVisible} onHide={closeCommentModal} placement="end">
                        <Offcanvas.Header closeButton>
                            <Offcanvas.Title>{commentCount} Comments</Offcanvas.Title>
                        </Offcanvas.Header>
                        <Offcanvas.Body className="d-flex flex-column" style={{ height: "calc(100% - 62px)" }}>
                            <CommentList
                                findPost={findPost}
                                options={commentListOptions}
                                setCommentCount={setCommentCount}
                            />
                        </Offcanvas.Body>
                    </Offcanvas>
                    <Modal show={detailsModalVisible} onHide={closeDetailsModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Code details</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <ul>
                                <li>Title: <i>{code.name}</i></li>
                                <li>Author: <i>{code.userName}</i></li>
                                <li>Creation Date: <i>{code.createdAt?.split("T")[0]}</i></li>
                                <li>Last Changed: <i>{DateUtils.format(new Date(code.updatedAt!))}</i></li>
                                <li>Line Count: <i>{lineCount}</i></li>
                                <li>Character Count: <i>{characterCount}</i></li>
                            </ul>
                        </Modal.Body>
                    </Modal>
                    <ReactionsList title="Likes" visible={codeVotesModalVisible} onClose={closeVotesModal} showReactions={true} countPerPage={10} options={codeVotesModalOptions} />
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
            <div className="d-flex align-items-center justify-content-between p-2 border-bottom" style={{ height: "44px" }}>
                <div>
                    <Link to="/">
                        <img src="/resources/images/logo.png" height="32px" width="96px" />
                    </Link>
                </div>
                <div>
                    <AuthNavigation />
                </div>
            </div>
            <Toast
                className="position-absolute bottom-0 end-0 m-2"
                style={{ zIndex: "9999" }}
                bg={message.success ? "success" : "danger"}
                onClose={() => setMessage(prev => ({ success: prev.success }))}
                show={(message.errors && message.errors.length > 0) || !!message.message}
                delay={2500}
                autohide>
                <Toast.Body className="text-white">
                    <b>{message.success ? message.message : message.errors ? message.errors[0]?.message : ""}</b>
                </Toast.Body>
            </Toast>
            {
                code &&
                <div className="wb-playground-container">
                    <div className="d-flex align-items-center justify-content-between p-1" style={{ height: "44px" }}>
                        <div className="d-flex">
                            <Button className="text-muted" variant="link" onClick={goBack}>
                                <FaArrowLeft />
                            </Button>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                            {
                                code.id &&
                                <>
                                    <div className="d-flex align-items-center gap-2">
                                        <ProfileAvatar size={32} avatarImage={code.userAvatar!} />
                                        <div>
                                            <div>
                                                <b>{truncate(code.name!, 10)}</b>
                                            </div>
                                            <div className="d-flex justify-content-start small">
                                                <ProfileName userId={code.userId!} userName={code.userName!} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="wb-playground-voting small">
                                        <span onClick={voteCode} className={"wb-discuss-voting__button" + (code.isUpvoted ? " text-black" : "")}>
                                            <FaThumbsUp />
                                        </span>
                                        <span className="wb-playground-comments__button" onClick={() => showCodeVotesModal(code.id ?? null)}>{code.votes}</span>
                                    </div>
                                    <div className="wb-playground-comments small">
                                        <span className="wb-playground-comments__button" onClick={openCommentModal}>
                                            <FaComment />
                                        </span>
                                        <span>{commentCount}</span>
                                    </div>
                                    {
                                        !code.isPublic &&
                                        <div className="wb-playground-public small">
                                            <FaLock />
                                        </div>
                                    }
                                </>
                            }
                            {
                                code.language == "web" &&
                                <Button size="sm" variant="link" className="text-dark" onClick={() => setConsoleVisible(true)}>
                                    <FaTerminal />
                                </Button>
                            }
                            <Dropdown>
                                <Dropdown.Toggle as={EllipsisDropdownToggle}></Dropdown.Toggle>
                                <Dropdown.Menu style={{ width: "200px" }}>
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
                                                            <Dropdown.ItemText className="d-flex justify-content-between align-items-center">
                                                                <span>Public</span>
                                                                <ToggleSwitch value={codePublic} onChange={(e) => toggleCodePublic((e.target as HTMLInputElement).checked)} />
                                                            </Dropdown.ItemText>
                                                        </>
                                                    }
                                                </>
                                            }
                                        </>
                                    }
                                    <Dropdown.ItemText className="border d-flex justify-content-between">
                                        <div>Font</div>
                                        <div className="d-flex gap-1">
                                            <span className="wb-playground-options__button" onClick={zoomOut}>-</span>
                                            <span className="d-flex justify-content-center" style={{ width: "32px" }}>{(editorOptions.scale * 100).toFixed(0)}%</span>
                                            <span className="wb-playground-options__button" onClick={zoomIn}>+</span>
                                        </div>
                                    </Dropdown.ItemText>
                                    {
                                        (code && code.id) &&
                                        <>
                                            <Dropdown.Item onClick={() => setDetailsModalVisible(true)}>Details</Dropdown.Item>
                                            <Dropdown.Item
                                                onClick={() => {
                                                    navigator.clipboard.writeText(window.location.href);
                                                }}
                                            >
                                                Share
                                            </Dropdown.Item>
                                        </>
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
                        options={editorOptions}
                        consoleVisible={consoleVisible}
                        hideConsole={() => setConsoleVisible(false)}
                        toggleConsole={() => setConsoleVisible(prev => !prev)}
                    />
                </div>
            }
        </>
    )
}

export default PlaygroundEditor
