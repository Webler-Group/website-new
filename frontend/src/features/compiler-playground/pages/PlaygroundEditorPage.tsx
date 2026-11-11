import { Badge, Button, Dropdown, FormControl, Modal, Offcanvas, Toast } from "../../../components/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ProfileName from "../../../components/ProfileName";
import { FaComment, FaLock, FaTerminal, FaThumbsUp } from "react-icons/fa6";
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
import { useConnectionStatus } from "../../../context/connectionStatus";
import useUnsavedChangesGuard from "../hooks/useUnsavedChangesGuard";
import useVisualViewport from "../hooks/useVisualViewport";
import { copyToClipboard } from "../../../utils/ClipboardUtils";
import { getCodeDraftKey,loadCodeDraft, removeCodeDraft, saveCodeDraft, shouldRestoreCodeDraft } from "../hooks/localCodeDraft";

/** Last version known to be persisted on the server (or the template for new code) */
interface CodeBaseline {
    /** localStorage key used for offline backups of this code */
    draftKey: string | null;
    source: string;
    css: string;
    js: string;
    updatedAt: string | null;
}

const SCALE_VALUES = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];

const getCreditsHeaders = (language: string, username: string): string[] => {
    const message = "Created by " + username;
    switch (language) {
        case "web":   return [`<!-- ${message} -->`, `/* ${message} */`, `// ${message}`];
        case "c":
        case "cpp":
        case "csharp":
        case "java":
        case "kotlin":
        case "nodejs":
        case "typescript":
        case "go":
        case "rust":  return [`// ${message}`];
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

    // Starts true so "Code not found" is not flashed before the first load begins
    const [loading, setLoading] = useState(true);
    const [commentCount, setCommentCount] = useState(0);
    const [findPost, setFindPost] = useState<{ id: string, isReply: boolean } | null>(null);
    const [commentListOptions, setCommentListOptions] = useState({ section: "Codes", params: { codeId } });
    const [message, setMessage] = useState<{ success: boolean; message?: string; errors?: any[]; }>({ success: true });
    const [pageTitle, setPageTitle] = useState("");
    const [consoleVisible, setConsoleVisible] = useState(false);
    const [logsCount, setLogsCount] = useState(0);
    const [baseline, setBaseline] = useState<CodeBaseline | null>(null);
    // Comment drafts survive closing the comments offcanvas (which unmounts CommentList) while on this code page
    const [commentDrafts, setCommentDrafts] = useState(() => new Map<string, string>());

    const { online } = useConnectionStatus();
    const { viewportVars } = useVisualViewport();

    const hasUnsavedChanges = !!code && !!baseline &&
        (source !== baseline.source || css !== baseline.css || js !== baseline.js);
    const { blocker, allowNextNavigation } = useUnsavedChangesGuard(hasUnsavedChanges);

    const latestRef = useRef({ online, hasUnsavedChanges, baseline, source, css, js });
    latestRef.current = { online, hasUnsavedChanges, baseline, source, css, js };

    // True while a local backup exists for this code; it then keeps tracking edits (even online) until saved
    const backupActiveRef = useRef(false);

    const backupDraftNow = useCallback(() => {
        const { hasUnsavedChanges, baseline, source, css, js } = latestRef.current;
        if (!hasUnsavedChanges || !baseline?.draftKey) return false;
        backupActiveRef.current = true;
        return saveCodeDraft(baseline.draftKey, {
            source,
            cssSource: css,
            jsSource: js,
            baseUpdatedAt: baseline.updatedAt,
            savedAt: Date.now()
        });
    }, []);

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
        // Reset previous code so a failed request does not leave the old one displayed
        setCode(null);
        setBaseline(null);
        backupActiveRef.current = false;
        setCommentDrafts(new Map());
        if (codeId) {
            getCode();
            setCommentListOptions({ section: "Codes", params: { codeId } });
        } else {
            getCodeByTemplate();
        }
    }, [codeId]);

    // Offline backup: while the connection is lost, keep unsaved code in localStorage
    useEffect(() => {
        const draftKey = baseline?.draftKey;
        if (!draftKey) return;
        if (!hasUnsavedChanges) {
            removeCodeDraft(draftKey);
            backupActiveRef.current = false;
            return;
        }
        if (online && !backupActiveRef.current) return;
        const timer = setTimeout(backupDraftNow, 300);
        return () => clearTimeout(timer);
    }, [online, hasUnsavedChanges, baseline, source, css, js]);

    // Flush the backup immediately when the page is being closed while offline (debounce may not have fired)
    useEffect(() => {
        const handlePageHide = () => {
            if (!latestRef.current.online) backupDraftNow();
        };
        window.addEventListener("pagehide", handlePageHide);
        return () => window.removeEventListener("pagehide", handlePageHide);
    }, []);

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
    }, [code, userInfo, source, css, js, online, baseline]);

    const getCode = async () => {
        setLoading(true);
        const result = await sendJsonRequest<GetCodeData>(`/codes/GetCode`, "POST", { codeId });
        if (result.data) {
            const { code: fetched } = result.data;
            const draftKey = getCodeDraftKey(userInfo?.id, fetched.id, null);
            setCode(fetched);
            setCodeName(fetched.name);
            setCodePublic(fetched.isPublic);
            setCommentCount(fetched.comments);
            setBaseline({
                draftKey,
                source: fetched.source,
                css: fetched.cssSource,
                js: fetched.jsSource,
                updatedAt: fetched.updatedAt
            });
            applyLoadedSources(draftKey, fetched.source, fetched.cssSource, fetched.jsSource, fetched.updatedAt);
        }
        setLoading(false);
    };

    const getCodeByTemplate = async () => {
        setLoading(true);
        const result = await sendJsonRequest<GetTemplateData>(`/codes/templates/${language}`, "POST");
        if (result.data) {
            const { template } = result.data;
            const draftKey = getCodeDraftKey(userInfo?.id, undefined, language);
            setCode({
                language: language!,
                comments: 0,
                votes: 0,
                isPublic: false,
                source: template.source,
                cssSource: template.cssSource,
                jsSource: template.jsSource,
            } satisfies UnsavedCode);
            setBaseline({
                draftKey,
                source: template.source,
                css: template.cssSource,
                js: template.jsSource,
                updatedAt: null
            });
            applyLoadedSources(draftKey, template.source, template.cssSource, template.jsSource, null);
        }
        setLoading(false);
    };

    /** Put loaded sources into the editor, restoring a local offline backup if it is the newer version */
    const applyLoadedSources = (draftKey: string | null, src: string, cssSrc: string, jsSrc: string, serverUpdatedAt: string | null) => {
        const draft = draftKey ? loadCodeDraft(draftKey) : null;
        const draftDiffers = !!draft && (draft.source !== src || draft.cssSource !== cssSrc || draft.jsSource !== jsSrc);

        if (draft && draftDiffers && shouldRestoreCodeDraft(draft, serverUpdatedAt)) {
            setSource(draft.source);
            setCss(draft.cssSource);
            setJs(draft.jsSource);
            backupActiveRef.current = true;
            setMessage({ success: true, message: "Restored unsaved changes from this device" });
            return;
        }

        if (draft && draftKey) {
            removeCodeDraft(draftKey);
            if (draftDiffers) {
                setMessage({ success: false, errors: [{ message: "A newer version was saved elsewhere, local changes discarded" }] });
            }
        }
        setSource(src);
        setCss(cssSrc);
        setJs(jsSrc);
    };

    /** Server confirmed the code content -> it becomes the new "saved" baseline */
    const applyEditResult = (data: EditCodeData) => {
        setCode(prev => (prev && isCodeSaved(prev)) ? { ...prev, ...data } : prev);
        setBaseline(prev => prev && {
            ...prev,
            source: data.source,
            css: data.cssSource,
            js: data.jsSource,
            updatedAt: data.updatedAt
        });
    };

    /** Saving is impossible while offline - keep the code safe locally instead */
    const handleOfflineSave = () => {
        if (latestRef.current.hasUnsavedChanges && backupDraftNow()) {
            setMessage({ success: false, errors: [{ message: "You are offline. Code was saved locally on this device" }] });
        } else {
            setMessage({ success: false, errors: [{ message: "You are offline. Try again when the connection is back" }] });
        }
    };

    /**
     * @param includeEditorSources true = save current editor contents;
     *   false = only change metadata (name / visibility) and keep the last saved sources
     */
    const editCode = async (name: string, isPublic: boolean, includeEditorSources: boolean) => {
        if (!code || !isCodeSaved(code)) return null;
        const saved = includeEditorSources || !baseline
            ? { source, css, js }
            : { source: baseline.source, css: baseline.css, js: baseline.js };
        return sendJsonRequest<EditCodeData>("/codes/EditCode", "PUT", {
            codeId: code.id,
            name,
            isPublic,
            source: saved.source,
            cssSource: saved.css,
            jsSource: saved.js,
        });
    };

    const saveCode = async () => {
        if (!code || !userInfo) return;
        if (!online) {
            handleOfflineSave();
            return;
        }
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
                if (baseline?.draftKey) removeCodeDraft(baseline.draftKey);
                allowNextNavigation();
                navigate("/Compiler-Playground/" + result.data.code.id, { replace: !isCodeSaved(code) });
            } else {
                setMessage({ success: false, errors: result?.error });
            }
        } else {
            // Rename - must not save unsaved editor changes
            const result = await editCode(codeName, code.isPublic, false);
            if (result?.data) {
                applyEditResult(result.data);
                closeSaveModal();
                setMessage({ success: true, message: "Code renamed successfully" });
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
        if (!online) {
            handleOfflineSave();
            return;
        }
        if (isCodeSaved(code) && code.user.id === userInfo.id) {
            setLoading(true);
            const result = await editCode(code.name, code.isPublic, true);
            if (result?.data) {
                applyEditResult(result.data);
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
            if (baseline?.draftKey) removeCodeDraft(baseline.draftKey);
            allowNextNavigation();
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
        if (!code || !isCodeSaved(code)) return;
        if (!online) {
            setMessage({ success: false, errors: [{ message: "You are offline. Try again when the connection is back" }] });
            return;
        }
        setLoading(true);
        const result = await editCode(code.name, isPublic, false);
        if (result?.data) {
            applyEditResult(result.data);
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

    const handleShare = async () => {
        if (await copyToClipboard(window.location.href)) {
            setMessage({ success: true, message: "Link copied to clipboard" });
        } else {
            setMessage({ success: false, errors: [{ message: "Could not copy link" }] });
        }
    };

    const handleCodeSearch = () => {
        codeEditorRef.current?.openSearch();
    };

    const lineCount = source.split("\n").length + css.split("\n").length + js.split("\n").length;
    const characterCount = source.length + css.length + js.length;
    const savedCode = code && isCodeSaved(code) ? code : null;

    const stayOnPage = () => blocker.reset?.();
    const leavePage = () => {
        // Leaving deliberately while online discards changes; offline backups are kept to be restored later
        if (online && baseline?.draftKey) {
            removeCodeDraft(baseline.draftKey);
            backupActiveRef.current = false;
        }
        blocker.proceed?.();
    };

    return (
        <>
            <Modal show={blocker.state === "blocked"} onHide={stayOnPage} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Unsaved changes</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    You have unsaved changes in your code. Do you really want to leave this page?
                    {!online && (
                        <div className="mt-2 small text-muted">
                            You are offline - your changes are kept on this device and will be restored when you open this code again.
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={stayOnPage}>Stay</Button>
                    <Button variant="danger" onClick={leavePage}>Leave</Button>
                </Modal.Footer>
            </Modal>

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
                        <Offcanvas.Body className="wb-comments-offcanvas-body d-flex flex-column">
                            <CommentList
                                findPost={findPost}
                                options={commentListOptions}
                                setCommentCount={setCommentCount}
                                drafts={commentDrafts}
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

            <div ref={viewportVars} className="wb-compiler-playground-container">

                <div className="wb-app-toolbar d-flex align-items-center justify-content-between p-2 border-bottom">
                    <Link to="/">
                        <img src="/resources/images/logo.svg" height="32px" width="96px" alt="Webler logo" />
                    </Link>
                    <AuthNavigation />
                </div>

                <Toast
                    className="wb-compiler-playground-toast position-absolute bottom-0 end-0 m-2"
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
                        <div className="wb-app-toolbar d-flex align-items-center justify-content-between p-1">
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
                                            <span className="wb-util-clickable" onClick={() => showCodeVotesModal(savedCode.id ?? null)}>
                                                {savedCode.votes}
                                            </span>
                                        </div>

                                        <div className="wb-compiler-playground-comments small">
                                            <span className="wb-util-clickable" onClick={openCommentModal}>
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
                                    <Dropdown.Menu className="wb-ui-dropdown-menu--wide">
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
                                                <span className="wb-compiler-playground-options-button" onClick={zoomOut}>-</span>
                                                <span className="wb-compiler-playground-zoom-value d-flex justify-content-center">
                                                    {(editorOptions.scale * 100).toFixed(0)}%
                                                </span>
                                                <span className="wb-compiler-playground-options-button" onClick={zoomIn}>+</span>
                                            </div>
                                        </Dropdown.ItemText>

                                        <Dropdown.ItemText className="d-flex justify-content-between">
                                            <div>Line Wrap</div>
                                            <input
                                                type="checkbox"
                                                checked={editorOptions.lineWrap}
                                                onChange={(e) => updateEditorOptions({ ...editorOptions, lineWrap: e.target.checked })}
                                            />
                                        </Dropdown.ItemText>

                                        <Dropdown.Item className="border-bottom" onClick={handleCodeSearch}>Search</Dropdown.Item>

                                        {savedCode && (
                                            <>
                                                <Dropdown.Item onClick={() => setDetailsModalVisible(true)}>Details</Dropdown.Item>
                                                <Dropdown.Item onClick={handleShare}>
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
                            tabHeightOffset={130}
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