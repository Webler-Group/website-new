import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Modal, Nav, Spinner, Tab } from "react-bootstrap";
import { useApi } from "../context/apiCommunication";
import "./ContentImages.css";

type ContentItem = {
    id: string;
    type: number;
    name: string;
    mimetype?: string;
    size?: number;
    createdAt?: string | number;
    url?: string | null;
    previewUrl?: string | null;
};

type ListResponse = {
    success: boolean;
    items: ContentItem[];
};

type UploadResponse = {
    success: boolean;
    data: { fileId: string; url: string; name: string };
};

interface ContextMenuState {
    item: ContentItem;
    x: number;
    y: number;
}

interface ContentImagesProps {
    section: string;
    show: boolean;
    onHide: () => void;
    onSelect: (url: string, altText: string) => void;
}

const FOLDER_ICON = "/resources/images/folder.svg";
const IMAGE_ICON = "/resources/images/image.svg";

const ContentImages = ({ section, show, onHide, onSelect }: ContentImagesProps) => {
    const { sendJsonRequest } = useApi();

    const [tabKey, setTabKey] = useState<"library" | "upload">("library");

    // Current directory path as segments
    const [subPath, setSubPath] = useState<string[]>([]);

    // Library
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [items, setItems] = useState<ContentItem[]>([]);

    // Upload
    const [uploadName, setUploadName] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState<string | null>(null);

    // Context menu
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteErr, setDeleteErr] = useState<string | null>(null);

    // Rename dialog
    const [renameTarget, setRenameTarget] = useState<ContentItem | null>(null);
    const [renameName, setRenameName] = useState("");
    const [renaming, setRenaming] = useState(false);
    const [renameErr, setRenameErr] = useState<string | null>(null);

    // Move dialog
    const [moveTarget, setMoveTarget] = useState<ContentItem | null>(null);
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

    // ── Fetch ──────────────────────────────────────────────────────────────

    const fetchList = useCallback(async (path: string[]) => {
        setLoading(true);
        setErr(null);

        const result = (await sendJsonRequest(`/${section}/GetContentImages`, "POST", {
            subPath: path.length > 0 ? path.join("/") : undefined,
        })) as ListResponse | null;

        if (result?.success) {
            setItems(result.items ?? []);
        } else {
            setErr("Failed to load contents");
        }

        setLoading(false);
    }, [section, sendJsonRequest]);

    // Reset & load when modal opens
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

    // Close context menu on outside click
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

    // ── Navigation ─────────────────────────────────────────────────────────

    const navigateInto = (segment: string) => {
        const next = [...subPath, segment];
        setSubPath(next);
        fetchList(next);
    };

    const navigateTo = (upToIndex: number) => {
        const next = subPath.slice(0, upToIndex);
        setSubPath(next);
        fetchList(next);
    };

    // ── Item interaction ───────────────────────────────────────────────────

    const handleItemClick = (item: ContentItem) => {
        if (contextMenu) { setContextMenu(null); return; }
        if (item.type === 2) {
            navigateInto(item.name);
        } else if (item.url) {
            onSelect(item.url, item.name);
            onHide();
        }
    };

    // ── Context menu ───────────────────────────────────────────────────────

    const openContextMenu = (e: React.MouseEvent | React.TouchEvent, item: ContentItem) => {
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

    const handleTouchStart = (e: React.TouchEvent, item: ContentItem) => {
        longPressTimer.current = setTimeout(() => openContextMenu(e, item), 500);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // ── Upload ─────────────────────────────────────────────────────────────

    const handleUpload = async () => {
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
        )) as UploadResponse | null;

        if (result?.success) {
            setUploadName("");
            setUploadFile(null);
            setTabKey("library");
            await fetchList(subPath);
            onSelect(result.data.url, result.data.name);
            onHide();
        } else {
            setUploadErr("Upload failed");
        }

        setUploading(false);
    };

    // ── Delete ─────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteErr(null);

        const result = (await sendJsonRequest(`/${section}/DeleteContentImage`, "DELETE", {
            fileId: deleteTarget.id,
        })) as { success: boolean } | null;

        if (result?.success) {
            setDeleteTarget(null);
            await fetchList(subPath);
        } else {
            setDeleteErr("Delete failed");
        }
        setDeleting(false);
    };

    // ── Rename ─────────────────────────────────────────────────────────────

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
            setRenameTarget(null);
            await fetchList(subPath);
        } else {
            setRenameErr("Rename failed");
        }
        setRenaming(false);
    };

    // ── Move ───────────────────────────────────────────────────────────────

    const handleMove = async () => {
        if (!moveTarget) return;
        setMoving(true);
        setMoveErr(null);

        const result = (await sendJsonRequest(`/${section}/MoveContentImage`, "POST", {
            fileId: moveTarget.id,
            newSubPath: movePath.trim() || undefined,
        })) as { success: boolean } | null;

        if (result?.success) {
            setMoveTarget(null);
            await fetchList(subPath);
        } else {
            setMoveErr("Move failed");
        }
        setMoving(false);
    };

    const handleCreateFolder = async () => {
        const name = folderName.trim();
        if (!name) { setCreateFolderErr("Enter a folder name"); return; }

        setCreatingFolder(true);
        setCreateFolderErr(null);

        const result = (await sendJsonRequest(`/${section}/CreateContentImageFolder`, "POST", {
            name,
            ...(subPathStr ? { subPath: subPathStr } : {}),
        })) as { success: boolean } | null;

        if (result?.success) {
            setCreateFolderOpen(false);
            setFolderName("");
            await fetchList(subPath);
        } else {
            setCreateFolderErr("Failed to create folder");
        }
        setCreatingFolder(false);
    };

    const getThumbnail = (item: ContentItem) => {
        if (item.previewUrl) return item.previewUrl;
        return item.type === 2 ? FOLDER_ICON : IMAGE_ICON;
    };

    const openNewFolder = () => {
        setFolderName("");
        setCreateFolderErr(null);
        setCreateFolderOpen(true);
    };

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <>
            {/* ── Delete confirm ─────────────────────────────────────────── */}
            <Modal
                style={{ zIndex: 1070 }}
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
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting…" : "Delete"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ── Rename ────────────────────────────────────────────────── */}
            <Modal
                style={{ zIndex: 1070 }}
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
                    <Button variant="secondary" onClick={() => setRenameTarget(null)} disabled={renaming}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleRename} disabled={renaming}>
                        {renaming ? "Saving…" : "Rename"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ── Move ──────────────────────────────────────────────────── */}
            <Modal
                style={{ zIndex: 1070 }}
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
                    <Form.Label className="text-muted small">
                        Destination path (leave empty for root)
                    </Form.Label>
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
                    <Button variant="secondary" onClick={() => setMoveTarget(null)} disabled={moving}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleMove} disabled={moving}>
                        {moving ? "Moving…" : "Move"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ── Create folder ─────────────────────────────────────────── */}
            <Modal
                style={{ zIndex: 1070 }}
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
                    <Button variant="secondary" onClick={() => setCreateFolderOpen(false)} disabled={creatingFolder}>
                        Cancel
                    </Button>
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
                contentClassName="wb-modal__container user-images"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Images</Modal.Title>
                </Modal.Header>

                <Modal.Body className="wb-user-images__body">
                    <Tab.Container activeKey={tabKey} onSelect={(k) => setTabKey((k as any) ?? "library")}>
                        <Nav variant="tabs">
                            <Nav.Item>
                                <Nav.Link eventKey="library">My images</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="upload">Upload</Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <Tab.Content className="pt-2 wb-user-images__tabcontent">

                            {/* Library tab */}
                            <Tab.Pane eventKey="library" className="wb-user-images__library">

                                {/* Toolbar: breadcrumb + actions */}
                                <div className="ci-toolbar">
                                    <div className="ci-breadcrumb">
                                        <button
                                            className="ci-crumb"
                                            onClick={() => navigateTo(0)}
                                            title="Root"
                                        >
                                            root
                                        </button>
                                        {subPath.map((seg, i) => (
                                            <span key={i} className="ci-crumb-segment">
                                                <span className="ci-crumb-sep">/</span>
                                                <button
                                                    className="ci-crumb"
                                                    onClick={() => navigateTo(i + 1)}
                                                >
                                                    {seg}
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="ci-toolbar-actions">
                                        {subPath.length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="outline-secondary"
                                                className="ci-back-btn"
                                                onClick={() => navigateTo(subPath.length - 1)}
                                            >
                                                ← Back
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            onClick={openNewFolder}
                                        >
                                            + New Folder
                                        </Button>
                                    </div>
                                </div>

                                {err && <Alert variant="danger">{err}</Alert>}

                                {loading ? (
                                    <div className="d-flex justify-content-center py-5">
                                        <Spinner animation="border" />
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="text-muted text-center py-4">
                                        {subPath.length > 0 ? "Empty folder." : "No images yet."}
                                    </div>
                                ) : (
                                    <div className="ci-grid">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`ci-item ci-item--${item.type}`}
                                                onClick={() => handleItemClick(item)}
                                                onContextMenu={(e) => openContextMenu(e, item)}
                                                onTouchStart={(e) => handleTouchStart(e, item)}
                                                onTouchEnd={cancelLongPress}
                                                onTouchMove={cancelLongPress}
                                                title={item.name}
                                            >
                                                <div className="ci-thumb-wrapper">
                                                    <img
                                                        src={getThumbnail(item)}
                                                        alt={item.name}
                                                        className={`ci-thumb ${item.previewUrl
                                                            ? "ci-thumb--preview"
                                                            : "ci-thumb--icon"}`}
                                                        draggable={false}
                                                    />
                                                </div>
                                                <div className="ci-name">{item.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Tab.Pane>

                            {/* Upload tab */}
                            <Tab.Pane eventKey="upload">
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
                                            {uploading ? "Uploading…" : "Upload & Insert"}
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
                    className="ci-context-menu"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="ci-ctx-item"
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
                        className="ci-ctx-item"
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
                        className="ci-ctx-item ci-ctx-item--danger"
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

export default ContentImages;
