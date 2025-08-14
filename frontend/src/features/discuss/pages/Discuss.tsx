import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";
import { ReactNode, useEffect, useState } from "react";
import { IQuestion } from "../components/Question";
import { useApi } from "../../../context/apiCommunication";
import { FaComment, FaThumbsUp } from "react-icons/fa";
import { Link } from "react-router-dom";

interface DiscussProps {
    MainPage: ReactNode
}

const Discuss = ({ MainPage }: DiscussProps) => {
    PageTitle("Webler - Discuss", false);

    const { sendJsonRequest } = useApi();
    const [questions, setQuestions] = useState<IQuestion[]>([]);

    useEffect(() => {
        getQuestions();
    }, []);

    const getQuestions = async () => {
        const result = await sendJsonRequest(`/Discussion`, "POST", {
            page: 1,
            count: 10,
            searchQuery: "",
            filter: 5,
            userId: null
        });
        if (result && result.questions) {
            setQuestions(result.questions);
        }
    }

    return (
        <Container>
            <div className="wb-discuss-questions-list-page d-block d-lg-flex gap-3 mt-2">
                <div className="flex-grow-1">{MainPage}</div>
                <div style={{ minWidth: "300px" }}>
                    <h2>Hot today</h2>
                    <div className="mt-4">
                        {
                            questions.map(question => {
                                return (
                                    <div key={question.id} className="rounded border bg-white p-2 mb-2">
                                        <Link to={"/Discuss/" + question.id}>
                                            <h5 style={{ wordBreak: "break-word" }}>{question.title}</h5>
                                        </Link>
                                        <div className="d-flex small">
                                            <div className="me-3 d-flex align-items-center">
                                                <FaThumbsUp />
                                                <span className="ms-2">{question.votes} Votes</span>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <FaComment />
                                                <span className="ms-2">{question.answers} Answers</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default Discuss;