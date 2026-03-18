import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ProfileName from "../../../components/ProfileName";
import { FaComment, FaLock, FaTerminal, FaThumbsUp } from "react-icons/fa6";
import { Badge, Button, Dropdown, FormControl, Modal, Offcanvas, Toast } from "react-bootstrap";
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
import { languagesInfo } from "../../../data/compilerLanguages";
import CommentList from "../../../components/comments/CommentList";
import ReactionsList from "../../../components/reactions/ReactionsList";
import { FaSearch } from "react-icons/fa";
import CodeEditor, { CodeEditorHandle } from "../components/CodeEditor";
import useEditorOptions from "../hooks/useEditorOptions";
import CompilerLanguagesEnum from "../../../data/CompilerLanguagesEnum";
import { CodeDetails, CreateCodeData, EditCodeData, GetCodeData, GetTemplateData, isCodeSaved, UnsavedCode, VoteCodeData } from "../../codes/types";

const SCALE_VALUES = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];

const getCreditsHeaders = (language: string, username: string): string[] => {
    const message = "Created by " + username;
    switch (language) {
        case "web":   return [`<!-- ${message} -->`, `/* ${message} */`, `// ${message}`];
        case "c":
        case "cpp":   return [`// ${message}`];
        case "python":
        case "ruby":  return [`# ${message}`];
        case "lua":   return [`-- ${message}`];
        default:      return [""];
    }
};

interface PlaygroundEditorPageProps {
    language: CompilerLanguagesEnum | null;
}

const PlaygroundEditorPage = ({ language }: PlaygroundEditorPageProps) => {
    const { sendJsonRequest } = useApi();
    const { codeId } = useParams();
    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { editorOptions, updateEditorOptions } = useEditorOptions();

    const codeEditorRef = useRef<CodeEditorHandle>(null);

    const [code, setCode] = useState<CodeDetails | UnsavedCode | null>(null);
    const [source, setSource] = useState("");
    const [css, setCss] = useState("");
    const [js, setJs] = useState("");

    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [codeName, setCodeName] = useState("");
    const [codePublic, setCodePublic] = useState(false);
    const [saveAsNew, setSaveAsNew] = useState(true);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [commentModalVisible, setCommentModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [codeVotesModalVisible, setCodeVotesModalVisible] = useState(false);
    const [codeVotesModalOptions, setCodeVotesModalOptions] = useState({ parentId: "" });

    const [isUserRegistering, setUserAuthPage] = useState(true);

    const [loading, setLoading] = useState(false);
    const [commentCount, setCommentCount] = useState(0);
    const [findPost, setFindPost] = useState<{ id: string, isReply: boolean } | null>(null);
    const [commentListOptions, setCommentListOptions] = useState({ section: "Codes", params: { codeId } });
    const [message, setMessage] = useState<{ success: boolean; message?: string; errors?: any[]; }>({ success: true });
    const [pageTitle, setPageTitle] = useState("");
    const [consoleVisible, setConsoleVisible] = useState(false);
    const [logsCount, setLogsCount] = useState(0);

    PageTitle(pageTitle);

    useEffect(() => {
        if (isCodeSaved(code!)) {
            setPageTitle(`${languagesInfo[code.language].displayName} Playground - ${code.name} | Webler Codes`);
        } else if (language) {
            setPageTitle(`${languagesInfo[language].displayName} Playground | Webler Codes`);
        }
    }, [language, code]);

    useEffect(() => {
        if (location.state?.postId) {
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
        } else {
            getCodeByTemplate();
        }
    }, [codeId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.userAgent.includes("Mac");
            const isSave = (isMac ? e.metaKey : e.ctrlKey) && e.key === "s";
            if (isSave) {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [code, userInfo, source, css, js]);

    const getCode = async () => {
        setLoading(true);
        const result = await sendJsonRequest<GetCodeData>(`/codes/GetCode`, "POST", { codeId });
        if (result.data) {
            const { code: fetched } = result.data;
            setCode(fetched);
            setCodeName(fetched.name);
            setCodePublic(fetched.isPublic);
            setSource(fetched.source);
            setCss(fetched.cssSource);
            setJs(fetched.jsSource);
            setCommentCount(fetched.comments);
        }
        setLoading(false);
    };

    const getCodeByTemplate = async () => {
        const result = await sendJsonRequest<GetTemplateData>(`/codes/templates/${language}`, "POST");
        if (result.data) {
            const { template } = result.data;
            setCode({
                language: language!,
                comments: 0,
                votes: 0,
                isPublic: false,
                source: template.source,
                cssSource: template.cssSource,
                jsSource: template.jsSource,
            } satisfies UnsavedCode);
            setSource(template.source);
            setCss(template.cssSource);
            setJs(template.jsSource);
        }
    };

    const editCode = async (isPublic: boolean) => {
        if (!code || !isCodeSaved(code)) return null;
        return sendJsonRequest<EditCodeData>("/codes/EditCode", "PUT", {
            codeId: code.id,
            name: codeName,
            isPublic,
            source,
            cssSource: css,
            jsSource: js,
        });
    };

    const saveCode = async () => {
        if (!code || !userInfo) return;
        setLoading(true);

        if (saveAsNew) {
            let creditsHeaders: string[] = [];
            if (isCodeSaved(code) && code.user.id && code.user.id !== userInfo.id) {
                creditsHeaders = getCreditsHeaders(code.language, code.user.name);
            }
            const result = await sendJsonRequest<CreateCodeData>("/codes/CreateCode", "POST", {
                name: codeName,
                language: code.language,
                source: (creditsHeaders[0] ? creditsHeaders[0] + "\n" : "") + source,
                cssSource: (creditsHeaders[1] ? creditsHeaders[1] + "\n" : "") + css,
                jsSource: (creditsHeaders[2] ? creditsHeaders[2] + "\n" : "") + js,
            });
            if (result.data) {
                closeSaveModal();
                navigate("/Compiler-Playground/" + result.data.code.id, { replace: !isCodeSaved(code) });
            } else {
                setMessage({ success: false, errors: result?.error });
            }
        } else {
            const result = await editCode(code.isPublic);
            if (result?.data) {
                setCode(prev => (prev && isCodeSaved(prev)) ? { ...prev, ...result.data } : prev);
                closeSaveModal();
                setMessage({ success: true, message: "Code updated successfully" });
            } else {
                setMessage({ success: false, errors: result?.error });
            }
        }

        setLoading(false);
    };

    const handleSave = async () => {
        if (!code) return;
        if (!userInfo) {
            setAuthModalVisible(true);
            return;
        }
        if (isCodeSaved(code) && code.user.id === userInfo.id) {
            setLoading(true);
            const result = await editCode(code.isPublic);
            if (result?.success) {
                setCode(prev => (prev && isCodeSaved(prev)) ? { ...prev, ...result.data } : prev);
                setMessage({ success: true, message: "Code updated successfully" });
            } else {
                setMessage({ success: false, errors: result?.error });
            }
            setLoading(false);
        } else {
            setCodeName("");
            openSaveModal(true);
        }
    };

    const handleSaveAs = () => {
        if (!userInfo) {
            setAuthModalVisible(true);
            return;
        }
        setCodeName("");
        openSaveModal(true);
    };

    const handleRename = () => {
        if (!code || !isCodeSaved(code)) return;
        setCodeName(code.name!);
        openSaveModal(false);
    };

    const handleDeleteCode = async () => {
        if (!code || !isCodeSaved(code)) return;
        setLoading(true);
        const result = await sendJsonRequest("/codes/DeleteCode", "DELETE", { codeId: code.id });
        if (result?.success) {
            navigate("/Codes?filter=3", { replace: true });
        }
        setLoading(false);
    };

    const voteCode = async () => {
        if (!code || !isCodeSaved(code)) return;
        if (!userInfo) {
            navigate("/Users/Login");
            return;
        }
        const vote = code.isUpvoted ? 0 : 1;
        const result = await sendJsonRequest<VoteCodeData>("/Codes/VoteCode", "POST", { codeId: code.id, vote });
        if (result.data?.vote === vote) {
            setCode(prev =>
                prev && isCodeSaved(prev)
                    ? { ...prev, votes: prev.votes + (vote ? 1 : -1), isUpvoted: vote === 1 }
                    : prev
            );
        } else {
            setMessage({ success: false, errors: result?.error });
        }
    };

    const toggleCodePublic = async (isPublic: boolean) => {
        setLoading(true);
        const result = await editCode(isPublic);
        if (result?.data) {
            setCode(prev => (prev && isCodeSaved(prev)) ? { ...prev, ...result.data } : prev);
            setCodePublic(result.data.isPublic);
        } else {
            setMessage({ success: false, errors: result?.error });
        }
        setLoading(false);
    };

    const openCommentModal = () => { if (codeId) setCommentModalVisible(true); };
    const closeCommentModal = () => setCommentModalVisible(false);
    const openSaveModal = (asNew: boolean) => { setSaveModalVisible(true); setSaveAsNew(asNew); };
    const closeSaveModal = () => setSaveModalVisible(false);
    const closeDetailsModal = () => setDetailsModalVisible(false);
    const closeAuthModal = () => setAuthModalVisible(false);
    const closeDeleteModal = () => setDeleteModalVisible(false);
    const closeVotesModal = () => setCodeVotesModalVisible(false);

    const showCodeVotesModal = (id: string | null) => {
        if (!id) return;
        setCodeVotesModalOptions({ parentId: id });
        setCodeVotesModalVisible(true);
    };

    const zoomIn = () => {
        const idx = SCALE_VALUES.indexOf(editorOptions.scale);
        const scale = idx === -1 ? 1.0 : SCALE_VALUES[Math.min(idx + 1, SCALE_VALUES.length - 1)];
        updateEditorOptions({ ...editorOptions, scale });
    };

    const zoomOut = () => {
        const idx = SCALE_VALUES.indexOf(editorOptions.scale);
        const scale = idx === -1 ? 1.0 : SCALE_VALUES[Math.max(idx - 1, 0)];
        updateEditorOptions({ ...editorOptions, scale });
    };

    const handleCodeSearch = () => {
        codeEditorRef.current?.openSearch();
    };

    const lineCount = source.split("\n").length + css.split("\n").length + js.split("\n").length;
    const characterCount = source.length + css.length + js.length;
    const savedCode = code && isCodeSaved(code) ? code : null;

    return (
        <>
            <Modal show={authModalVisible} onHide={closeAuthModal} centered>
                <Modal.Header closeButton />
                <Modal.Body>
                    {isUserRegistering
                        ? <RegisterForm onToggleClick={() => setUserAuthPage(false)} onRegister={closeAuthModal} />
                        : <LoginForm onToggleClick={() => setUserAuthPage(true)} onLogin={closeAuthModal} />
                    }
                </Modal.Body>
            </Modal>

            {savedCode && (
                <>
                    <Offcanvas show={commentModalVisible} onHide={closeCommentModal} className="wb-comments-offcanvas" placement="end">
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
                                <li>Title: <i>{savedCode.name}</i></li>
                                <li>Author: <i>{savedCode.user.name}</i></li>
                                <li>Creation Date: <i>{savedCode.createdAt?.split("T")[0]}</i></li>
                                <li>Last Changed: <i>{DateUtils.format(new Date(savedCode.updatedAt))}</i></li>
                                <li>Line Count: <i>{lineCount}</i></li>
                                <li>Character Count: <i>{characterCount}</i></li>
                            </ul>
                        </Modal.Body>
                    </Modal>

                    <ReactionsList
                        title="Likes"
                        visible={codeVotesModalVisible}
                        onClose={closeVotesModal}
                        showReactions
                        countPerPage={10}
                        options={codeVotesModalOptions}
                    />
                </>
            )}

            <Modal show={deleteModalVisible} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Your code will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteCode}>Delete</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={saveModalVisible} onHide={closeSaveModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Save code</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>How would you like to name your code?</p>
                    <FormControl
                        className="mt-2"
                        type="text"
                        placeholder="Unnamed"
                        value={codeName}
                        onChange={(e) => setCodeName(e.target.value)}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeSaveModal}>Cancel</Button>
                    <Button variant="primary" onClick={saveCode} disabled={codeName.length === 0}>Save</Button>
                </Modal.Footer>
            </Modal>

            <div className="wb-compiler-playground-container">

                <div className="d-flex align-items-center justify-content-between p-2 border-bottom" style={{ height: "44px" }}>
                    <Link to="/">
                        <img src="/resources/images/logo.svg" height="32px" width="96px" alt="Webler logo" />
                    </Link>
                    <AuthNavigation />
                </div>

                <Toast
                    className="position-absolute bottom-0 end-0 m-2"
                    style={{ zIndex: 9999 }}
                    bg={message.success ? "success" : "danger"}
                    onClose={() => setMessage(prev => ({ success: prev.success }))}
                    show={(message.errors && message.errors.length > 0) || !!message.message}
                    delay={1500}
                    autohide
                >
                    <Toast.Body className="text-white">
                        <b>{message.success ? message.message : message.errors?.[0]?.message ?? ""}</b>
                    </Toast.Body>
                </Toast>

                {code ? (
                    <>
                        <div className="d-flex align-items-center justify-content-between p-1" style={{ height: "44px" }}>
                            <div className="d-flex align-items-center">
                                {savedCode && (
                                    <>
                                        <div className="d-flex align-items-center gap-2">
                                            <ProfileAvatar size={32} avatarUrl={savedCode.user.avatarUrl} />
                                            <div>
                                                <div><b>{truncate(savedCode.name!, 10)}</b></div>
                                                <div className="d-flex justify-content-start small">
                                                    <ProfileName userId={savedCode.user.id} userName={savedCode.user.name} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="wb-compiler-playground-voting small">
                                            <span
                                                onClick={voteCode}
                                                className={"wb-icon-button" + (savedCode.isUpvoted ? " text-black" : "")}
                                            >
                                                <FaThumbsUp />
                                            </span>
                                            <span style={{ cursor: "pointer" }} onClick={() => showCodeVotesModal(savedCode.id ?? null)}>
                                                {savedCode.votes}
                                            </span>
                                        </div>

                                        <div className="wb-compiler-playground-comments small">
                                            <span style={{ cursor: "pointer" }} onClick={openCommentModal}>
                                                <FaComment />
                                            </span>
                                            <span>{commentCount}</span>
                                        </div>

                                        {!savedCode.isPublic && (
                                            <div className="wb-compiler-playground-public small">
                                                <FaLock />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="d-flex gap-2 align-items-center">
                                <Button
                                    size="sm"
                                    variant="link"
                                    className="text-dark position-relative"
                                    onClick={handleCodeSearch}
                                >
                                    <FaSearch />
                                </Button>

                                {code.language === "web" && (
                                    <Button
                                        size="sm"
                                        variant="link"
                                        className="text-dark position-relative"
                                        onClick={() => setConsoleVisible(true)}
                                    >
                                        <FaTerminal />
                                        {logsCount > 0 && (
                                            <Badge bg="danger" pill className="position-absolute">
                                                {logsCount > 99 ? "99+" : logsCount}
                                            </Badge>
                                        )}
                                    </Button>
                                )}

                                <Dropdown>
                                    <Dropdown.Toggle as={EllipsisDropdownToggle} />
                                    <Dropdown.Menu style={{ width: "200px" }}>
                                        <Dropdown.Item onClick={handleSave}>Save</Dropdown.Item>
                                        <Dropdown.Item onClick={handleSaveAs}>Save As</Dropdown.Item>

                                        {userInfo && savedCode && savedCode.user.id === userInfo.id && (
                                            <>
                                                <Dropdown.Item onClick={handleRename}>Rename</Dropdown.Item>
                                                <Dropdown.Item onClick={() => setDeleteModalVisible(true)}>Delete</Dropdown.Item>
                                                <Dropdown.ItemText className="d-flex justify-content-between align-items-center">
                                                    <span>Public</span>
                                                    <ToggleSwitch
                                                        value={codePublic}
                                                        onChange={(e) => toggleCodePublic((e.target as HTMLInputElement).checked)}
                                                    />
                                                </Dropdown.ItemText>
                                            </>
                                        )}

                                        <Dropdown.ItemText className="border-top d-flex justify-content-between">
                                            <div>Font</div>
                                            <div className="d-flex gap-1">
                                                <span className="wb-compiler-playground-options__button" onClick={zoomOut}>-</span>
                                                <span className="d-flex justify-content-center" style={{ width: "32px" }}>
                                                    {(editorOptions.scale * 100).toFixed(0)}%
                                                </span>
                                                <span className="wb-compiler-playground-options__button" onClick={zoomIn}>+</span>
                                            </div>
                                        </Dropdown.ItemText>

                                        <Dropdown.ItemText className="border-bottom d-flex justify-content-between">
                                            <div>Line Wrap</div>
                                            <input
                                                type="checkbox"
                                                checked={editorOptions.lineWrap}
                                                onChange={(e) => updateEditorOptions({ ...editorOptions, lineWrap: e.target.checked })}
                                            />
                                        </Dropdown.ItemText>

                                        {savedCode && (
                                            <>
                                                <Dropdown.Item onClick={() => setDetailsModalVisible(true)}>Details</Dropdown.Item>
                                                <Dropdown.Item onClick={() => navigator.clipboard.writeText(window.location.href)}>
                                                    Share
                                                </Dropdown.Item>
                                            </>
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>
                        </div>

                        <CodeEditor
                            ref={codeEditorRef}
                            code={code}
                            source={source}
                            setSource={(value: string) => setSource(value)}
                            css={css}
                            setCss={(value: string) => setCss(value)}
                            js={js}
                            setJs={(value: string) => setJs(value)}
                            options={editorOptions}
                            tabHeightStyle="calc(100dvh - 130px)"
                            consoleVisible={consoleVisible}
                            hideConsole={() => setConsoleVisible(false)}
                            toggleConsole={() => setConsoleVisible(prev => !prev)}
                            setLogsCount={setLogsCount}
                        />
                    </>
                ) : (
                    !loading && (
                        <div className="d-flex h-100 flex-column align-items-center justify-content-center text-center">
                            <h4><FaSearch /></h4>
                            <h5>Code not found</h5>
                            <Link to="/Codes">Go back</Link>
                        </div>
                    )
                )}
            </div>
        </>
    );
};

export default PlaygroundEditorPage;