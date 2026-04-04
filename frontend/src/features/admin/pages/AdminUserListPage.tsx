import { useState, useEffect } from "react";
import { Table, Form, Row, Col, Button, Container, Breadcrumb } from "react-bootstrap";
import { useApi } from "../../../context/apiCommunication";
import RolesEnum from "../../../data/RolesEnum";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AdminUser, AdminUserListData } from "../types";

const rolesOptions = ["All", ...Object.values(RolesEnum)];

const sortOptions = [
    { value: 1, label: "Newest registered" },
    { value: 2, label: "Oldest registered" },
    { value: 3, label: "Last login (newest)" },
    { value: 4, label: "Last login (oldest)" }
];

const AdminUserListPage = () => {
    const { sendJsonRequest } = useApi();
    const [searchParams, setSearchParams] = useSearchParams();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
    const [role, setRole] = useState("All");
    const [sortFilter, setSortFilter] = useState(1);

    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [ready, setReady] = useState(false);
    const navigate = useNavigate();
    const pageSize = 50;

    useEffect(() => {
        setSearch(searchParams.get("query") ?? "");
        setActiveFilter((searchParams.get("active") as "all" | "true" | "false") ?? "all");
        setRole(searchParams.get("role") ?? "All");
        setSortFilter(searchParams.has("filter") ? Number(searchParams.get("filter")) : 1);
        setPage(searchParams.has("page") ? Number(searchParams.get("page")) : 1);
        setReady(true);
    }, []);

    const fetchUsers = async (params: {
        search: string;
        activeFilter: "all" | "true" | "false";
        role: string;
        sortFilter: number;
        page: number;
    }) => {
        const result = await sendJsonRequest<AdminUserListData>("/Admin/Users", "POST", {
            search: params.search.trim() || undefined,
            active: params.activeFilter === "all" ? undefined : params.activeFilter === "true",
            role: params.role !== "All" ? params.role : undefined,
            filter: params.sortFilter,
            count: pageSize,
            page: params.page
        });

        if (result.data) {
            setUsers(result.data.users);
            setTotalCount(result.data.count);
        }
    };

    const syncParams = (params: {
        search: string;
        activeFilter: string;
        role: string;
        sortFilter: number;
        page: number;
    }) => {
        const next = new URLSearchParams();
        next.set("page", params.page.toString());
        next.set("filter", params.sortFilter.toString());
        next.set("query", params.search);
        next.set("active", params.activeFilter);
        next.set("role", params.role);
        setSearchParams(next, { replace: true });
    };

    useEffect(() => {
        if (!ready) return;
        fetchUsers({ search, activeFilter, role, sortFilter, page });
    }, [ready, page]);

    const handleSearch = () => {
        const newPage = 1;
        syncParams({ search, activeFilter, role, sortFilter, page: newPage });
        if (page !== newPage) {
            setPage(newPage);
        } else {
            fetchUsers({ search, activeFilter, role, sortFilter, page: newPage });
        }
    };

    const handleResetFilters = () => {
        setSearch("");
        setActiveFilter("all");
        setRole("All");
        setSortFilter(1);
    };

    const handlePageChange = (pageNum: number) => {
        syncParams({ search, activeFilter, role, sortFilter, page: pageNum });
        setPage(pageNum);
    };

    return (
        <Container className="mt-4">
            <Breadcrumb>
                <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/Admin" }}>
                    Admin Panel
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                    User Search
                </Breadcrumb.Item>
            </Breadcrumb>

            <Form
                className="mb-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                }}
            >
                <Row className="align-items-end">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="d-block small">Search by Name</Form.Label>
                            <Form.Control
                                size="sm"
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by username"
                            />
                        </Form.Group>
                    </Col>

                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">Sort</Form.Label>
                            <Form.Select
                                size="sm"
                                value={sortFilter}
                                onChange={(e) => setSortFilter(Number(e.target.value))}
                            >
                                {sortOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>

                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">Active</Form.Label>
                            <Form.Select
                                size="sm"
                                value={activeFilter}
                                onChange={(e) =>
                                    setActiveFilter(e.target.value as
                                        | "all"
                                        | "true"
                                        | "false")
                                }
                            >
                                <option value="all">All</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>

                    <Col md={2}>
                        <Form.Group>
                            <Form.Label className="small">Role</Form.Label>
                            <Form.Select
                                size="sm"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                {rolesOptions.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
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
                        <th>Name</th>
                        <th>Email</th>
                        <th>Roles</th>
                        <th>Verified</th>
                        <th>Active</th>
                        <th>Register Date</th>
                        <th>Last Login</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="text-center small">
                                No users found
                            </td>
                        </tr>
                    ) : (
                        users.map((u) => (
                            <tr key={u.id}
                                onClick={() => navigate(`/Admin/UserSearch/${u.id}`)}
                                style={{ cursor: "pointer" }}>
                                <td>{u.id}</td>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td>{u.roles.join(", ")}</td>
                                <td>{u.verified ? "Yes" : "No"}</td>
                                <td>{u.active ? "Yes" : "No"}</td>
                                <td>{new Date(u.registerDate).toLocaleDateString("en")}</td>
                                <td>{u.lastLoginDate ? new Date(u.lastLoginDate).toLocaleDateString("en") : "—"}</td>
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
                    changePage={handlePageChange}
                    ellipsis={1}
                />
            </div>

            <div className="mt-2 small">
                Showing {users.length} of {totalCount} users
            </div>
        </Container>
    );
};

export default AdminUserListPage;
