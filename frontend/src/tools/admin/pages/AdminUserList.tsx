import { useState, useEffect } from "react";
import { Table, Form, Row, Col, Button, Container, Breadcrumb } from "react-bootstrap";
import { useApi } from "../../../context/apiCommunication";
import roles from "../../../data/roles";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { Link, useNavigate } from "react-router-dom";
import { IAdminUser } from "./ModView";

const rolesOptions = ["All", ...roles];

const AdminUserList = () => {
    const { sendJsonRequest } = useApi();

    const [users, setUsers] = useState<IAdminUser[]>([]);
    const [search, setSearch] = useState("");
    const [date, setDate] = useState<Date | null>(null);
    const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
    const [role, setRole] = useState("All");

    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const navigate = useNavigate();
    const pageSize = 50;

    const fetchUsers = async () => {
        const result = await sendJsonRequest("/Admin/Users", "POST", {
            search: search.trim() || undefined,
            date: date ? date.toISOString() : undefined,
            active: activeFilter === "all" ? undefined : activeFilter === "true",
            role: role !== "All" ? role : undefined,
            count: pageSize,
            page
        });

        if (result && result.users) {
            setUsers(result.users);
            setTotalCount(result.count);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page]);

    const handleSearch = () => {
        if (page !== 1) {
            setPage(1);
        } else {
            fetchUsers();
        }
    };

    const handleResetFilters = () => {
        setSearch("");
        setDate(null);
        setActiveFilter("all");
        setRole("All");
    };

    const handlePageChange = (pageNum: number) => {
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

                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small">Register Date</Form.Label>
                            <DatePicker
                                selected={date}
                                onChange={(d) => {
                                    setDate(d);
                                }}
                                className="form-control form-control-sm"
                                placeholderText="Select date"
                                isClearable
                            />
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
                    </tr>
                </thead>
                <tbody>
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="text-center small">
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

export default AdminUserList;