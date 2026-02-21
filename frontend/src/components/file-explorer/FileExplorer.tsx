import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Modal, Nav, Spinner, Tab } from "react-bootstrap";
import "./FileExplorer.css";
import { useAuth } from "../../features/auth/context/authContext";
import DateUtils from "../../utils/DateUtils";
import ProfileName from "../../components/ProfileName";
import { useApi } from "../../context/apiCommunication";

type FileExplorerItem = {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar: string | null;
    type: number;
    name: string;
    mimetype?: string;
    size?: number;
    updatedAt: string;
    url?: string | null;
    previewUrl?: string | null;
};

type FileExplorerListResponse = {
    success: boolean;
    items: FileExplorerItem[];
};

type FileExplorerUploadResponse = {
    success: boolean;
    data: { id: string; url: string; name: string; mimetype: string; size: number; updatedAt: string; previewUrl: string | null };
};

type FileExplorerCreateFolderResponse = {
    success: boolean;
    data: { id: string; name: string; updatedAt: string };
};

interface FileExplorerContextMenuState {
    item: FileExplorerItem;
    x: number;
    y: number;
}

interface FileExplorerProps {
    section: string;
    show: boolean;
    onHide: () => void;
    onSelect: (url: string, altText: string) => void;
    title?: string;
}

const FOLDER_ICON = "/resources/images/folder.svg";
const IMAGE_ICON = "/resources/images/image.svg";

// Confirm dialogs sit above the main modal (Bootstrap modal z-index: 1055)
const CONFIRM_MODAL_Z = 1070;

const formatSize = (bytes?: number): string | null => {
    if (bytes == null) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileExplorer = ({ section, show, onHide, onSelect, title = "Images" }: FileExplorerProps) => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();

    const [tabKey, setTabKey] = useState<"library" | "upload">("library");
    const [subPath, setSubPath] = useState<string[]>([]);

    // Library
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [items, setItems] = useState<FileExplorerItem[]>([]);

    // Upload
    const [uploadName, setUploadName] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState<string | null>(null);

    // Context menu
    const [contextMenu, setContextMenu] = useState<FileExplorerContextMenuState | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState<FileExplorerItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteErr, setDeleteErr] = useState<string | null>(null);

    // Rename dialog
    const [renameTarget, setRenameTarget] = useState<FileExplorerItem | null>(null);
    const [renameName, setRenameName] = useState("");
    const [renaming, setRenaming] = useState(false);
    const [renameErr, setRenameErr] = useState<string | null>(null);

    // Move dialog
    const [moveTarget, setMoveTarget] = useState<FileExplorerItem | null>(null);
    const [movePath, setMovePath] = useState("");
    const [moving, setMoving] = useState(false);
    const [moveErr, setMoveErr] = useState<string | null>(null);

    // Create folder dialog
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [createFolderErr, setCreateFolderErr] = useState<string | null>(null);

    // Derived
    const subPathStr = subPath.join("/");

    const fetchList = useCallback(async (path: string[]) => {
        setLoading(true);
        setErr(null);

        const result = (await sendJsonRequest(`/${section}/GetContentImages`, "POST", {
            subPath: path.length > 0 ? path.join("/") : undefined,
        })) as FileExplorerListResponse | null;

        if (result?.success) {
            setItems(result.items ?? []);
        } else {
            setErr("Failed to load contents");
        }

        setLoading(false);
    }, [section, sendJsonRequest]);

    useEffect(() => {
        if (!show) return;
        setTabKey("library");
        setSubPath([]);
        setItems([]);
        setErr(null);
        setUploadName("");
        setUploadFile(null);
        setUploadErr(null);
        setContextMenu(null);
        setDeleteTarget(null);
        setRenameTarget(null);
        setMoveTarget(null);
        setCreateFolderOpen(false);
        fetchList([]);
    }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!contextMenu) return;
        const handler = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [contextMenu]);

    const navigateInto = (segment: string) => {
        const next = [...subPath, segment];
        setSubPath(next);
        fetchList(next);
    };

    const navigateTo = (upToIndex: number) => {
        if (upToIndex === subPath.length) return;
        const next = subPath.slice(0, upToIndex);
        setSubPath(next);
        fetchList(next);
    };

    const handleItemClick = (item: FileExplorerItem) => {
        if (contextMenu) { setContextMenu(null); return; }
        if (item.type === 2) {
            navigateInto(item.name);
        } else if (item.url) {
            onSelect(item.url, item.name);
            onHide();
        }
    };

    const openContextMenu = (e: React.MouseEvent | React.TouchEvent, item: FileExplorerItem) => {
        e.preventDefault();
        e.stopPropagation();
        let x: number, y: number;
        if ("touches" in e && e.touches.length > 0) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else if ("clientX" in e) {
            x = e.clientX;
            y = e.clientY;
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            x = rect.left;
            y = rect.bottom;
        }
        setContextMenu({ item, x, y });
    };

    const handleTouchStart = (e: React.TouchEvent, item: FileExplorerItem) => {
        longPressTimer.current = setTimeout(() => openContextMenu(e, item), 500);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleUpload = async () => {
        if (!userInfo) return;
        setUploadErr(null);
        const name = uploadName.trim();
        if (!uploadFile) { setUploadErr("Select a file"); return; }
        if (!name) { setUploadErr("Enter a name"); return; }
        if (name.length > 80) { setUploadErr("Name is too long"); return; }

        setUploading(true);

        const result = (await sendJsonRequest(
            `/${section}/UploadContentImage`,
            "POST",
            { image: uploadFile, name, ...(subPathStr ? { subPath: subPathStr } : {}) },
            undefined,
            true
        )) as FileExplorerUploadResponse | null;

        if (result?.success && result.data) {
            const newItem: FileExplorerItem = {
                id: result.data.id,
                authorId: userInfo.id,
                authorName: userInfo.name,
                authorAvatar: userInfo.avatarImage,
                type: 1,
                name: result.data.name,
                url: result.data.url,
                previewUrl: result.data.previewUrl ?? null,
                updatedAt: result.data.updatedAt,
                mimetype: result.data.mimetype,
                size: result.data.size,
            };
            setItems(prev => [...prev, newItem]);
            setUploadName("");
            setUploadFile(null);
            setTabKey("library");
        } else {
            setUploadErr("Upload failed");
        }

        setUploading(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteErr(null);

        const result = (await sendJsonRequest(`/${section}/DeleteContentImage`, "DELETE", {
            fileId: deleteTarget.id,
        })) as { success: boolean } | null;

        if (result?.success) {
            const deletedId = deleteTarget.id;
            setDeleteTarget(null);
            setItems(prev => prev.filter(i => i.id !== deletedId));
        } else {
            setDeleteErr("Delete failed");
        }
        setDeleting(false);
    };

    const handleRename = async () => {
        if (!renameTarget) return;
        const name = renameName.trim();
        if (!name) { setRenameErr("Enter a name"); return; }

        setRenaming(true);
        setRenameErr(null);

        const result = (await sendJsonRequest(`/${section}/MoveContentImage`, "POST", {
            fileId: renameTarget.id,
            newName: name,
            ...(subPathStr ? { newSubPath: subPathStr } : {}),
        })) as { success: boolean } | null;

        if (result?.success) {
            const renamedId = renameTarget.id;
            setRenameTarget(null);
            setItems(prev => prev.map(i => i.id === renamedId ? { ...i, name } : i));
        } else {
            setRenameErr("Rename failed");
        }
        setRenaming(false);
    };

    const handleMove = async () => {
        if (!moveTarget) return;
        setMoving(true);
        setMoveErr(null);

        const result = (await sendJsonRequest(`/${section}/MoveContentImage`, "POST", {
            fileId: moveTarget.id,
            newSubPath: movePath.trim() || undefined,
        })) as { success: boolean } | null;

        if (result?.success) {
            const movedId = moveTarget.id;
            setMoveTarget(null);
            setItems(prev => prev.filter(i => i.id !== movedId));
        } else {
            setMoveErr("Move failed");
        }
        setMoving(false);
    };

    const handleCreateFolder = async () => {
        if (!userInfo) return;
        const name = folderName.trim();
        if (!name) { setCreateFolderErr("Enter a folder name"); return; }

        setCreatingFolder(true);
        setCreateFolderErr(null);

        const result = (await sendJsonRequest(`/${section}/CreateContentImageFolder`, "POST", {
            name,
            ...(subPathStr ? { subPath: subPathStr } : {}),
        })) as FileExplorerCreateFolderResponse | null;

        if (result?.success && result.data) {
            const newFolder: FileExplorerItem = {
                id: result.data.id,
                authorId: userInfo.id,
                authorName: userInfo.name,
                authorAvatar: userInfo.avatarImage,
                type: 2,
                name: result.data.name,
                updatedAt: result.data.updatedAt,
            };
            setCreateFolderOpen(false);
            setFolderName("");
            setItems(prev => [newFolder, ...prev]);
        } else {
            setCreateFolderErr("Failed to create folder");
        }
        setCreatingFolder(false);
    };

    const getThumbnail = (item: FileExplorerItem) => {
        if (item.previewUrl) return item.previewUrl;
        return item.type === 2 ? FOLDER_ICON : IMAGE_ICON;
    };

    const openNewFolder = () => {
        setFolderName("");
        setCreateFolderErr(null);
        setCreateFolderOpen(true);
    };

    const getTypeLabel = (item: FileExplorerItem): string | null => {
        if (item.type === 2) return "folder";
        if (!item.mimetype) return null;
        return item.mimetype.split("/").pop() ?? item.mimetype;
    };

    return (
        <>
            {/* ── Delete confirm ─────────────────────────────────────────── */}
            <Modal
                style={{ zIndex: CONFIRM_MODAL_Z }}
                backdropClassName="wb-file-explorer-confirm-backdrop"
                show={!!deleteTarget}
                onHide={() => { if (!deleting) setDeleteTarget(null); }}
                centered
                size="sm"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Delete?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {deleteErr && <Alert variant="danger" className="mb-2">{deleteErr}</Alert>}
                    {deleteTarget && (
                        <div>
                            Permanently delete{" "}
                            <span className="fw-semibold">{deleteTarget.name}</span>?
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting…" : "Delete"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ── Rename ────────────────────────────────────────────────── */}
            <Modal
                style={{ zIndex: CONFIRM_MODAL_Z }}
                backdropClassName="wb-file-explorer-confirm-backdrop"
                show={!!renameTarget}
                onHide={() => { if (!renaming) setRenameTarget(null); }}
                centered
                size="sm"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Rename</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {renameErr && <Alert variant="danger" className="mb-2">{renameErr}</Alert>}
                    <Form.Control
                        size="sm"
                        value={renameName}
                        onChange={e => setRenameName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleRename()}
                        disabled={renaming}
                        maxLength={80}
                        autoFocus
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setRenameTarget(null)} disabled={renaming}>Cancel</Button>
                    <Button variant="primary" onClick={handleRename} disabled={renaming}>
                        {renaming ? "Saving…" : "Rename"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ── Move ──────────────────────────────────────────────────── */}
            <Modal
                style={{ zIndex: CONFIRM_MODAL_Z }}
                backdropClassName="wb-file-explorer-confirm-backdrop"
                show={!!moveTarget}
                onHide={() => { if (!moving) setMoveTarget(null); }}
                centered
                size="sm"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Move to folder</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {moveErr && <Alert variant="danger" className="mb-2">{moveErr}</Alert>}
                    <Form.Label className="text-muted small">Destination path (leave empty for root)</Form.Label>
                    <Form.Control
                        size="sm"
                        value={movePath}
                        onChange={e => setMovePath(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleMove()}
                        disabled={moving}
                        placeholder="e.g. backgrounds/dark"
                        autoFocus
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setMoveTarget(null)} disabled={moving}>Cancel</Button>
                    <Button variant="primary" onClick={handleMove} disabled={moving}>
                        {moving ? "Moving…" : "Move"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ── Create folder ─────────────────────────────────────────── */}
            <Modal
                style={{ zIndex: CONFIRM_MODAL_Z }}
                backdropClassName="wb-file-explorer-confirm-backdrop"
                show={createFolderOpen}
                onHide={() => { if (!creatingFolder) setCreateFolderOpen(false); }}
                centered
                size="sm"
            >
                <Modal.Header closeButton>
                    <Modal.Title>New Folder</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {createFolderErr && <Alert variant="danger" className="mb-2">{createFolderErr}</Alert>}
                    <Form.Control
                        size="sm"
                        value={folderName}
                        onChange={e => setFolderName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
                        disabled={creatingFolder}
                        maxLength={80}
                        autoFocus
                        placeholder="Folder name"
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setCreateFolderOpen(false)} disabled={creatingFolder}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreateFolder} disabled={creatingFolder}>
                        {creatingFolder ? "Creating…" : "Create"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ── Main modal ────────────────────────────────────────────── */}
            <Modal
                show={show}
                onHide={onHide}
                size="lg"
                fullscreen="sm-down"
                contentClassName="wb-modal__container wb-file-explorer-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>{title}</Modal.Title>
                </Modal.Header>

                <Modal.Body className="wb-file-explorer-body">
                    <Tab.Container activeKey={tabKey} onSelect={(k) => setTabKey((k as any) ?? "library")}>
                        <Nav variant="tabs" className="flex-shrink-0">
                            <Nav.Item>
                                <Nav.Link eventKey="library">Library</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="upload">Upload</Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <Tab.Content className="wb-file-explorer-tabcontent">

                            {/* Library tab */}
                            <Tab.Pane eventKey="library" className="wb-file-explorer-library-pane">

                                {/* Toolbar: breadcrumb + actions — stays fixed, never scrolls */}
                                <div className="wb-file-explorer-toolbar">
                                    <div className="wb-file-explorer-breadcrumb">
                                        <button
                                            className="wb-file-explorer-crumb"
                                            onClick={() => navigateTo(0)}
                                            title="Root"
                                        >
                                            root
                                        </button>
                                        {subPath.map((seg, i) => (
                                            <span key={i} className="wb-file-explorer-crumb-segment">
                                                <span className="wb-file-explorer-crumb-sep">/</span>
                                                <button
                                                    className="wb-file-explorer-crumb"
                                                    onClick={() => navigateTo(i + 1)}
                                                >
                                                    {seg}
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="wb-file-explorer-toolbar-actions">
                                        {subPath.length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="outline-secondary"
                                                className="wb-file-explorer-back-btn"
                                                onClick={() => navigateTo(subPath.length - 1)}
                                            >
                                                ← Back
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline-primary" onClick={openNewFolder}>
                                            + New Folder
                                        </Button>
                                    </div>
                                </div>

                                {err && <Alert variant="danger">{err}</Alert>}

                                {/* Scrollable list area */}
                                <div className="wb-file-explorer-scroll">
                                    {loading ? (
                                        <div className="d-flex justify-content-center py-5">
                                            <Spinner animation="border" />
                                        </div>
                                    ) : items.length === 0 ? (
                                        <div className="text-muted text-center py-4">
                                            {subPath.length > 0 ? "Empty folder." : "No images yet."}
                                        </div>
                                    ) : (
                                        <div className="wb-file-explorer-list">
                                            {items.map((item) => {
                                                const typeLabel = getTypeLabel(item);
                                                const sizeLabel = item.type !== 2 ? formatSize(item.size) : null;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`wb-file-explorer-item wb-file-explorer-item--${item.type === 2 ? "folder" : "file"}`}
                                                        onClick={() => handleItemClick(item)}
                                                        onContextMenu={(e) => openContextMenu(e, item)}
                                                        onTouchStart={(e) => handleTouchStart(e, item)}
                                                        onTouchEnd={cancelLongPress}
                                                        onTouchMove={cancelLongPress}
                                                        title={item.name}
                                                    >
                                                        <div className="wb-file-explorer-thumb-wrapper">
                                                            <img
                                                                src={getThumbnail(item)}
                                                                alt={item.name}
                                                                className={`wb-file-explorer-thumb ${item.previewUrl
                                                                    ? "wb-file-explorer-thumb--preview"
                                                                    : "wb-file-explorer-thumb--icon"}`}
                                                                draggable={false}
                                                            />
                                                        </div>
                                                        <div className="wb-file-explorer-item-info">
                                                            <div className="wb-file-explorer-row1">
                                                                <div className="wb-file-explorer-name">{item.name}</div>
                                                                <span className="wb-file-explorer-date">
                                                                    {DateUtils.format(new Date(item.updatedAt))}
                                                                </span>
                                                            </div>
                                                            <div className="wb-file-explorer-row2">
                                                                <div className="wb-file-explorer-tags">
                                                                    {typeLabel && (
                                                                        <span className="wb-file-explorer-tag">{typeLabel}</span>
                                                                    )}
                                                                    {sizeLabel && (
                                                                        <span className="wb-file-explorer-tag">{sizeLabel}</span>
                                                                    )}
                                                                </div>
                                                                <ProfileName
                                                                    userId={item.authorId}
                                                                    userName={item.authorName}
                                                                    className="wb-file-explorer-author"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </Tab.Pane>

                            {/* Upload tab */}
                            <Tab.Pane eventKey="upload" className="wb-file-explorer-upload-pane">
                                {uploadErr && <Alert variant="danger">{uploadErr}</Alert>}

                                <Form>
                                    <Form.Group className="mb-3">
                                        <Form.Label>File</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                setUploadFile(e.target.files?.[0] ?? null)
                                            }
                                            disabled={uploading}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Name</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            value={uploadName}
                                            onChange={(e) => setUploadName(e.target.value)}
                                            maxLength={80}
                                            disabled={uploading}
                                        />
                                    </Form.Group>

                                    {subPathStr && (
                                        <div className="text-muted small mb-3">
                                            Uploading to: <code>{subPathStr}</code>
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-end gap-2">
                                        <Button size="sm" variant="secondary" onClick={onHide} disabled={uploading}>
                                            Close
                                        </Button>
                                        <Button size="sm" variant="primary" onClick={handleUpload} disabled={uploading}>
                                            {uploading ? "Uploading…" : "Upload"}
                                        </Button>
                                    </div>
                                </Form>
                            </Tab.Pane>

                        </Tab.Content>
                    </Tab.Container>
                </Modal.Body>
            </Modal>

            {/* ── Floating context menu ─────────────────────────────────── */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="wb-file-explorer-context-menu"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="wb-file-explorer-ctx-item"
                        onClick={() => {
                            setMoveTarget(contextMenu.item);
                            setMovePath("");
                            setMoveErr(null);
                            setContextMenu(null);
                        }}
                    >
                        Move
                    </button>
                    <button
                        className="wb-file-explorer-ctx-item"
                        onClick={() => {
                            setRenameTarget(contextMenu.item);
                            setRenameName(contextMenu.item.name);
                            setRenameErr(null);
                            setContextMenu(null);
                        }}
                    >
                        Rename
                    </button>
                    <button
                        className="wb-file-explorer-ctx-item wb-file-explorer-ctx-item--danger"
                        onClick={() => {
                            setDeleteTarget(contextMenu.item);
                            setDeleteErr(null);
                            setContextMenu(null);
                        }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </>
    );
};

export default FileExplorer;
