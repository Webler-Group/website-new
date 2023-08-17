import { FormEvent, useEffect, useRef, useState } from 'react'
import { Button, Form, FormControl } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap';
import ApiCommunication from '../../../helpers/apiCommunication';
import Question from '../components/Question';
import { useAuth } from '../../auth/context/authContext';
import { PaginationControl } from 'react-bootstrap-pagination-control';
import QuestionPlaceholder from '../components/QuestionPlaceholder';

const QuestionList = () => {

    const { userInfo } = useAuth();
    const [questions, setQuestions] = useState<any[]>([]);
    const questionsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [questionCount, setQuestionCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState(1);
    const searchInputElement = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        getQuestions();
    }, [currentPage, filter, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();

        if (searchInputElement.current) {
            setSearchQuery(searchInputElement.current.value.trim());
        }
    }

    const getQuestions = async () => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Discussion?page=${currentPage}&count=${questionsPerPage}&filter=${filter}&query=${searchQuery}` + (userInfo ? `&profileId=${userInfo.id}` : ""), "GET");
        if (result && result.questions) {
            setQuestions(result.questions);
            setQuestionCount(result.count);
        }
        setLoading(false);
    }

    let placeholders = [];
    for (let i = 0; i < questionsPerPage; ++i) {
        placeholders.push(<QuestionPlaceholder key={i} />);
    }

    return (
        <>
            <h2>Q&A Discussions</h2>
            <Form className="d-flex mt-4" onSubmit={handleSearch}>
                <FormControl type="search" placeholder="Search..." ref={searchInputElement} />
                <Button className="ms-2" type="submit">Search</Button>
            </Form>
            <div className="mt-4 row justify-content-between">
                <div className="col-6 col-sm-4">
                    <Form.Select value={filter} onChange={(e) => setFilter(Number(e.target.selectedOptions[0].value))}>
                        <option value="1">Most Recent</option>
                        <option value="2">Unanswered</option>
                        {
                            userInfo &&
                            <>
                                <option value="3">My Questions</option>
                                <option value="4">My Answers</option>
                            </>
                        }
                    </Form.Select>
                </div>
                <LinkContainer to={userInfo ? "/Discuss/New" : "/Login"}>
                    <Button className="col-6 col-sm-4">Ask a question</Button>
                </LinkContainer>
            </div>
            <div className="my-3">
                {
                    loading ?
                        placeholders
                        :
                        questionCount == 0 ?
                            <div className="d-flex flex-column align-items-center justify-content-center h-100">
                                <h3>Nothing to show</h3>
                            </div>
                            :
                            questions.map(question => {
                                return (
                                    <Question question={question} searchQuery={searchQuery} key={question.id} />
                                )
                            })

                }
            </div>
            <div>
                <PaginationControl
                    page={currentPage}
                    between={3}
                    total={questionCount}
                    limit={questionsPerPage}
                    changePage={(page) => {
                        setCurrentPage(page);
                    }}
                    ellipsis={1}
                />
            </div>
        </>
    )
}

export default QuestionList