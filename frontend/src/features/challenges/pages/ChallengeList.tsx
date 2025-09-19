import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { FaPlus } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import { TagSearch } from "../../../components/InputTags";
import { PaginationControl } from "react-bootstrap-pagination-control";
import IChallenge from "../IChallenge";
import allowedUrls from "../../../data/discussAllowedUrls";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { SelectFormField } from "../../../components/FormField";
import { EllipsisLoaderPlaceholder } from "../../../components/Loader";
import useListView from "../../../components/hooks/useListView";
import PageTitle from "../../../layouts/PageTitle";


const ChallengeList = () => {
    PageTitle("Code Challenge");

    const challengesPerPage = 10;

    const { items, loading, itemsCount, filter, searchQuery, currentPage, 
        handleSearch,  handlePageChange, handleFilterSelect } = useListView<IChallenge>({
        endPoint: "/Challenge",
        method: "POST",
        itemsPerPage: challengesPerPage
    });

    const { userInfo } = useAuth();
    const navigate = useNavigate();

    return (
        <Container className="py-4 position-relative">
            <TagSearch
                placeholder="Search by title..."
                maxWidthPx={360}
                query={searchQuery}
                handleSearch={handleSearch}
            />

            <div className="mt-2 d-flex justify-content-between">
                <SelectFormField onChange={handleFilterSelect} value={filter} 
                    options={[
                        {label: "Easy", value: "1"},
                        {label: "Medium", value: "2"},
                        {label: "Hard", value: "3"},
                    ]}     
                />

                <SelectFormField onChange={() => {}} value={filter} 
                    options={[
                        {label: "Unsolved", value: "1"},
                        {label: "Solved", value: "2"}
                    ]}     
                />
            </div>

            <div className="mt-2">
                {
                    loading ?
                        <EllipsisLoaderPlaceholder />
                        :
                        itemsCount == 0 ?
                            <div className="wb-discuss-empty-questions">
                                <h3>Nothing to show</h3>
                            </div>
                            :
                            <Row className="mt-3">
                                {items.map((c: IChallenge, idx) => (
                                <Col md={6} lg={4} key={idx} className="mb-3">
                                    <Card className="shadow-sm h-100">
                                    <Card.Body onClick={() => { navigate("./" + c._id) }} style={{cursor:"pointer"}}>
                                        <Card.Title>{c.title}</Card.Title>
                                        <div className="d-flex flex-wrap gap-2">
                                            <span className="text-info p-1 rounded btn-text">{c.difficulty}</span>
                                            <span className="text-success p-1 rounded">+{c.xp} Reward</span>
                                        </div>
                                    </Card.Body>
                                    </Card>
                                </Col>
                                ))}
                            </Row>

                }
            </div>

            <div className='my-3'>
                <PaginationControl
                    page={currentPage}
                    between={3}
                    total={itemsCount}
                    limit={challengesPerPage}
                    changePage={handlePageChange}
                    ellipsis={1}
                />
            </div>

            {
                userInfo && userInfo.roles.some(role => ["Admin", "Creator"].includes(role)) &&
                <Button
                    variant="success"
                    className="position-fixed bottom-0 end-0 m-4 rounded-pill d-flex align-items-center"
                    style={{ zIndex: 1050 }}
                    onClick = {() => { navigate("./Create") }}
                >
                    <span className="d-none d-md-inline">+ Create Challenge</span>
                    <FaPlus className="d-inline d-md-none" size={24} />
                </Button>
            }
        
        </Container>
    );
};

export default ChallengeList;
