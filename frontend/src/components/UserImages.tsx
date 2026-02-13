import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Modal, Nav, Pagination, Row, Spinner, Tab } from "react-bootstrap";
import { useApi } from "../context/apiCommunication";
import { useAuth } from "../features/auth/context/authContext";
import "./UserImages.css";

type UserImageItem = {
    id: string;
    name: string;
    mimetype: string;
    size: number;
    createdAt: string | number;
    url: string;
};

type ListResponse = {
    success: boolean;
    data: {
        page: number;
        count: number;
        total: number;
        items: UserImageItem[];
    };
};

type UploadResponse = {
    success: boolean;
    data: {
        fileId: string;
        url: string;
        name: string;
    };
};

interface UserImagesProps {
    show: boolean;
    onHide: () => void;
    onSelect: (markdownImageUrl: string, altText: string) => void;
}

const UserImages = ({ show, onHide, onSelect }: UserImagesProps) => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();

    const [tabKey, setTabKey] = useState<"library" | "upload">("library");

    const [page, setPage] = useState(1);
    const count = 10;

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [items, setItems] = useState<UserImageItem[]>([]);
    const [total, setTotal] = useState(0);

    const [uploadName, setUploadName] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState<string | null>(null);

    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteErr, setDeleteErr] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / count));

    const pages = useMemo(() => {
        const arr: number[] = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, page + 2);
        for (let i = start; i <= end; i++) arr.push(i);
        return arr;
    }, [page, totalPages]);

    const fetchList = async (p = page) => {
        if (!userInfo?.id) return;
        setLoading(true);
        setErr(null);

        const result = (await sendJsonRequest("/Profile/GetPostImages", "POST", {
            page: p,
            count,
            userId: userInfo.id,
        })) as ListResponse | null;

        if (result && result.success) {
            setItems(result.data.items ?? []);
            setTotal(result.data.total ?? 0);
            setPage(result.data.page ?? p);
        } else {
            setErr("Failed to load images");
        }

        setLoading(false);
    };

    useEffect(() => {
        if (!show) return;
        setTabKey("library");
        setPage(1);
        setItems([]);
        setTotal(0);
        setUploadName("");
        setUploadFile(null);
        setUploadErr(null);
        setDeleteErr(null);
        setConfirmDelete(null);
        setDeletingId(null);
        fetchList(1);
    }, [show]);

    const handleSelect = (url: string, altText: string) => {
        onSelect(url, altText || "image");
        onHide();
    };

    const handleUpload = async () => {
        if (!userInfo?.id) return;

        setUploadErr(null);

        const name = uploadName.trim();
        if (!uploadFile) {
            setUploadErr("Select a file");
            return;
        }
        if (!name) {
            setUploadErr("Enter a name");
            return;
        }
        if (name.length > 80) {
            setUploadErr("Name is too long");
            return;
        }

        setUploading(true);

        const result = (await sendJsonRequest(
            "/Profile/UploadPostImage",
            "POST",
            { postImage: uploadFile, name },
            undefined,
            true
        )) as UploadResponse | null;

        if (result && result.success) {
            setUploadName("");
            setUploadFile(null);
            setTabKey("library");
            await fetchList(1);
            handleSelect(result.data.url, result.data.name);
        } else {
            setUploadErr("Upload failed");
        }

        setUploading(false);
    };

    const openDeleteConfirm = (id: string, name: string) => {
        setDeleteErr(null);
        setConfirmDelete({ id, name });
    };

    const closeDeleteModal = () => {
        if (deletingId) return;
        setConfirmDelete(null);
        setDeleteErr(null);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;

        setDeleteErr(null);
        setDeletingId(confirmDelete.id);

        const result = (await sendJsonRequest("/Profile/DeletePostImage", "DELETE", {
            fileId: confirmDelete.id,
        })) as { success: boolean } | null;

        if (result && result.success) {
            setConfirmDelete(null);
            setDeletingId(null);
            await fetchList(items.length === 1 && page > 1 ? page - 1 : page);
        } else {
            setDeleteErr("Delete failed");
            setDeletingId(null);
        }
    };

    return (
        <>
            <Modal
                style={{ zIndex: 1060 }}
                backdropClassName="wb-user-images-delete-modal__backdrop"
                size="sm"
                show={!!confirmDelete}
                onHide={closeDeleteModal}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {deleteErr && <Alert variant="danger" className="mb-2">{deleteErr}</Alert>}
                    {confirmDelete ? (
                        <div>
                            Image <span className="fw-semibold">{confirmDelete.name}</span> will be permanently deleted.
                        </div>
                    ) : null}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal} disabled={!!deletingId}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete} disabled={!!deletingId}>
                        {deletingId ? "Deleting..." : "Delete"}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={show}
                onHide={onHide}
                size="lg"
                fullscreen="sm-down"
                className="d-flex justify-content-center align-items-center"
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

                        <Tab.Content className="pt-3 wb-user-images__tabcontent">
                            <Tab.Pane eventKey="library" className="wb-user-images__library">
                                {err && <Alert variant="danger">{err}</Alert>}

                                {loading ? (
                                    <div className="d-flex justify-content-center py-4">
                                        <Spinner animation="border" />
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="text-muted">No images yet.</div>
                                ) : (
                                    <>
                                        <Row className="g-3">
                                            {items.map((it) => (
                                                <Col xs={6} md={4} key={it.id}>
                                                    <Card className="h-100">
                                                        <div style={{ aspectRatio: "1 / 1", overflow: "hidden" }}>
                                                            <Card.Img
                                                                src={it.url}
                                                                alt={it.name}
                                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                            />
                                                        </div>
                                                        <Card.Body className="py-2">
                                                            <div className="fw-semibold text-truncate" title={it.name}>
                                                                {it.name}
                                                            </div>
                                                            <div className="d-flex gap-2 mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="primary"
                                                                    className="w-100"
                                                                    onClick={() => handleSelect(it.url, it.name)}
                                                                    disabled={deletingId === it.id}
                                                                >
                                                                    Insert
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline-danger"
                                                                    onClick={() => openDeleteConfirm(it.id, it.name)}
                                                                    disabled={deletingId === it.id}
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>

                                        {totalPages > 1 && (
                                            <div className="d-flex justify-content-center mt-3">
                                                <Pagination className="mb-0">
                                                    <Pagination.First disabled={page === 1} onClick={() => fetchList(1)} />
                                                    <Pagination.Prev disabled={page === 1} onClick={() => fetchList(page - 1)} />
                                                    {pages.map((p) => (
                                                        <Pagination.Item key={p} active={p === page} onClick={() => fetchList(p)}>
                                                            {p}
                                                        </Pagination.Item>
                                                    ))}
                                                    <Pagination.Next disabled={page === totalPages} onClick={() => fetchList(page + 1)} />
                                                    <Pagination.Last disabled={page === totalPages} onClick={() => fetchList(totalPages)} />
                                                </Pagination>
                                            </div>
                                        )}
                                    </>
                                )}
                            </Tab.Pane>

                            <Tab.Pane eventKey="upload">
                                {uploadErr && <Alert variant="danger">{uploadErr}</Alert>}

                                <Form>
                                    <Form.Group className="mb-3">
                                        <Form.Label>File</Form.Label>
                                        <Form.Control
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
                                            value={uploadName}
                                            onChange={(e) => setUploadName(e.target.value)}
                                            maxLength={80}
                                            disabled={uploading}
                                        />
                                    </Form.Group>

                                    <div className="d-flex justify-content-end gap-2">
                                        <Button variant="secondary" onClick={onHide} disabled={uploading}>
                                            Close
                                        </Button>
                                        <Button variant="primary" onClick={handleUpload} disabled={uploading}>
                                            {uploading ? "Uploading..." : "Upload & Insert"}
                                        </Button>
                                    </div>
                                </Form>
                            </Tab.Pane>
                        </Tab.Content>
                    </Tab.Container>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default UserImages;
