import { ChangeEvent, useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap';
import { useApi } from '../../../context/apiCommunication';
import Question from '../components/Question';
import { useAuth } from '../../auth/context/authContext';
import { PaginationControl } from 'react-bootstrap-pagination-control';
import QuestionPlaceholder from '../components/QuestionPlaceholder';
import { useSearchParams } from 'react-router-dom';
import { TagSearch } from '../../../components/InputTags';

const DiscussListPage = () => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const [questions, setQuestions] = useState<any[]>([]);
    const questionsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [questionCount, setQuestionCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        getQuestions();
    }, [searchParams]);

    useEffect(() => {
        handlePageChange(1);
    }, [filter, searchQuery]);

    useEffect(() => {
        if (searchParams.has("page")) {
            setCurrentPage(Number(searchParams.get("page")))
        }
        if (searchParams.has("filter")) {
            setFilter(Number(searchParams.get("filter")))
        }
        if (searchParams.has("query")) {
            setSearchQuery(searchParams.get("query")!)
        }
    }, []);

    const handlePageChange = (page: number) => {
        if (currentPage === page) {
            return
        }
        searchParams.set("page", page.toString());
        setSearchParams(searchParams, { replace: true })
        setCurrentPage(page);
    }

    const handleSearch = (value: string) => {
        searchParams.set("query", value);
        setSearchParams(searchParams, { replace: true });
        setSearchQuery(value);
    }

    const getQuestions = async () => {
        setLoading(true);
        const page = searchParams.has("page") ? Number(searchParams.get("page")) : 1;
        const filter = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
        const searchQuery = searchParams.has("query") ? searchParams.get("query")! : "";
        const result = await sendJsonRequest(`/Discussion`, "POST", {
            page,
            count: questionsPerPage,
            filter,
            searchQuery,
            userId: userInfo ? userInfo.id : null
        });
        if (result && result.questions) {
            setQuestions(result.questions);
            setQuestionCount(result.count);
        }
        setLoading(false);
    }

    const handleFilterSelect = (e: ChangeEvent) => {
        const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value)
        searchParams.set("filter", value.toString())
        setSearchParams(searchParams, { replace: true })
        setFilter(value)
    }

    let placeholders = [];
    for (let i = 0; i < questionsPerPage; ++i) {
        placeholders.push(<QuestionPlaceholder key={i} />);
    }

    return (
        <div className="d-flex flex-column">
            <h2>Q&A Discussions</h2>
            <div className="mt-2">
                <Form.Label htmlFor="search" className="visually-hidden">
                    Search
                </Form.Label>
                <TagSearch
                    id="search"
                    placeholder="Search by tags or title..."
                    maxWidthPx={360}
                    query={searchQuery}
                    handleSearch={handleSearch}
                />
            </div>
            <div className="mt-2 d-flex justify-content-between">
                <Form.Label htmlFor="filter" className="visually-hidden">
                    Filter
                </Form.Label>
                <Form.Select id="filter" style={{ width: "140px" }} size='sm' value={filter} onChange={handleFilterSelect}>
                    <option value="1">Most Recent</option>
                    <option value="2">Unanswered</option>
                    <option value="6">Trending</option>
                    {
                        userInfo &&
                        <>
                            <option value="3">My Questions</option>
                            <option value="4">My Answers</option>
                        </>
                    }
                </Form.Select>
                <LinkContainer to="/Discuss/New">
                    <Button size='sm'>Ask a question</Button>
                </LinkContainer>
            </div>
            <div className="mt-2">
                {
                    loading ?
                        placeholders
                        :
                        questionCount == 0 ?
                            <div className="wb-discuss-empty-questions">
                                <h3>Nothing to show</h3>
                            </div>
                            :
                            questions.map(question => {
                                return (
                                    <Question question={question} searchQuery={searchQuery} key={question.id} showUserProfile={true} />
                                )
                            })

                }
            </div>
            <div className='my-3'>
                <PaginationControl
                    page={currentPage}
                    between={3}
                    total={questionCount}
                    limit={questionsPerPage}
                    changePage={handlePageChange}
                    ellipsis={1}
                />
            </div>
        </div>
    )
}

export default DiscussListPage