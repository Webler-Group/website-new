import { useState, useEffect } from "react";
import { Table, Form, Row, Col, Button, Container, Breadcrumb, Badge, Modal } from "react-bootstrap";
import { useApi } from "../../../context/apiCommunication";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import { IpRecord, IpListData, ToggleBanIpData, CreateIpData } from "../types";
import RolesEnum from "../../../data/RolesEnum";

const IpListPage = () => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();

    const [ips, setIps] = useState<IpRecord[]>([]);
    const [valueSearch, setValueSearch] = useState("");
    const [bannedFilter, setBannedFilter] = useState<"all" | "true" | "false">("all");

    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    const [ipToToggle, setIpToToggle] = useState<IpRecord | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createValue, setCreateValue] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);

    const isAdmin = userInfo?.roles.includes(RolesEnum.ADMIN);

    const fetchIps = async () => {
        const result = await sendJsonRequest<IpListData>("/Admin/Ips", "POST", {
            value: valueSearch.trim() || undefined,
            banned: bannedFilter === "all" ? undefined : bannedFilter === "true",
            count: pageSize,
            page
        });

        if (result.data) {
            setIps(result.data.ips);
            setTotalCount(result.data.count);
        }
    };

    useEffect(() => {
        fetchIps();
    }, [page]);

    const handleSearch = () => {
        if (page !== 1) {
            setPage(1);
        } else {
            fetchIps();
        }
    };

    const handleResetFilters = () => {
        setValueSearch("");
        setBannedFilter("all");
    };

    const handleCreateIp = async () => {
        const trimmed = createValue.trim();
        if (!trimmed) return;
        const result = await sendJsonRequest<CreateIpData>("/Admin/CreateIp", "POST", { value: trimmed });
        if (result.data) {
            setIps(prev => [result.data!, ...prev]);
            setTotalCount(prev => prev + 1);
            setShowCreateModal(false);
            setCreateValue("");
            setCreateError(null);
        } else {
            setCreateError(result.error?.[0]?.message ?? "Failed to create IP");
        }
    };

    const handleToggleBan = async () => {
        if (!ipToToggle) return;
        const result = await sendJsonRequest<ToggleBanIpData>("/Admin/ToggleBanIp", "POST", {
            ipId: ipToToggle.id,
            banned: !ipToToggle.banned
        });
        if (result.data) {
            setIps(prev => prev.map(ip =>
                ip.id === result.data!.id ? { ...ip, banned: result.data!.banned } : ip
            ));
        }
        setIpToToggle(null);
    };

    return (
        <>
            <Modal show={showCreateModal} onHide={() => { setShowCreateModal(false); setCreateValue(""); setCreateError(null); }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Add IP</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>IP Address</Form.Label>
                        <Form.Control
                            type="text"
                            value={createValue}
                            onChange={e => { setCreateValue(e.target.value); setCreateError(null); }}
                            placeholder="e.g. 192.168.1.1"
                            maxLength={45}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreateIp(); } }}
                        />
                        {createError && <Form.Text className="text-danger">{createError}</Form.Text>}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowCreateModal(false); setCreateValue(""); setCreateError(null); }}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreateIp} disabled={!createValue.trim()}>Add</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={!!ipToToggle} onHide={() => setIpToToggle(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{ipToToggle?.banned ? "Unban IP" : "Ban IP"}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to {ipToToggle?.banned ? "unban" : "ban"} <code>{ipToToggle?.value}</code>?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setIpToToggle(null)}>Cancel</Button>
                    <Button variant={ipToToggle?.banned ? "success" : "danger"} onClick={handleToggleBan}>
                        {ipToToggle?.banned ? "Unban" : "Ban"}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Container className="mt-4">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <Breadcrumb className="mb-0">
                        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/Admin" }}>
                            Admin Panel
                        </Breadcrumb.Item>
                        <Breadcrumb.Item>
                            IP List
                        </Breadcrumb.Item>
                    </Breadcrumb>
                    {isAdmin && (
                        <Button size="sm" variant="primary" onClick={() => setShowCreateModal(true)}>
                            Add IP
                        </Button>
                    )}
                </div>

                <Form
                    className="mb-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSearch();
                    }}
                >
                    <Row className="align-items-end">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="d-block small">Search by IP</Form.Label>
                                <Form.Control
                                    size="sm"
                                    type="search"
                                    value={valueSearch}
                                    onChange={(e) => setValueSearch(e.target.value)}
                                    placeholder="Search by IP address"
                                />
                            </Form.Group>
                        </Col>

                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="small">Banned</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={bannedFilter}
                                    onChange={(e) => setBannedFilter(e.target.value as "all" | "true" | "false")}
                                >
                                    <option value="all">All</option>
                                    <option value="true">Banned</option>
                                    <option value="false">Not Banned</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={2} className="d-flex gap-1">
                            <Button size="sm" type="submit" variant="primary">
                                Search
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                                Reset
                            </Button>
                        </Col>
                    </Row>
                </Form>

                <Table striped bordered hover responsive size="sm">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Value</th>
                            <th>Banned</th>
                            <th>Description</th>
                            {isAdmin && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {ips.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 5 : 4} className="text-center small">
                                    No IPs found
                                </td>
                            </tr>
                        ) : (
                            ips.map((ip) => (
                                <tr key={ip.id}>
                                    <td>{ip.id}</td>
                                    <td><code>{ip.value}</code></td>
                                    <td>
                                        {ip.banned
                                            ? <Badge bg="danger">Banned</Badge>
                                            : <Badge bg="success">Active</Badge>
                                        }
                                    </td>
                                    <td>{ip.description ?? <span className="text-muted">—</span>}</td>
                                    {isAdmin && (
                                        <td>
                                            <Button
                                                size="sm"
                                                variant={ip.banned ? "outline-success" : "outline-danger"}
                                                onClick={() => setIpToToggle(ip)}
                                            >
                                                {ip.banned ? "Unban" : "Ban"}
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>

                <div className="my-3">
                    <PaginationControl
                        page={page}
                        between={3}
                        total={totalCount}
                        limit={pageSize}
                        changePage={(p) => setPage(p)}
                        ellipsis={1}
                    />
                </div>

                <div className="mt-2 small">
                    Showing {ips.length} of {totalCount} IPs
                </div>
            </Container>
        </>
    );
};

export default IpListPage;
