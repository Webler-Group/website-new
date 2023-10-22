import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";
import { ReactNode, useEffect, useState } from "react";
import { IQuestion } from "../components/Question";
import ApiCommunication from "../../../helpers/apiCommunication";
import { FaComment, FaThumbsUp } from "react-icons/fa";
import { Link } from "react-router-dom";

interface DiscussProps {
    MainPage: ReactNode
}

const Discuss = ({ MainPage }: DiscussProps) => {

    PageTitle("Webler - Discuss", false);

    const [questions, setQuestions] = useState<IQuestion[]>([]);

    useEffect(() => {
        getQuestions();
    }, []);

    const getQuestions = async () => {
        const result = await ApiCommunication.sendJsonRequest(`/Discussion`, "POST", {
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
            <div className="wb-discuss-questions-list-page d-block d-lg-flex p-4">
                <div className="wb-discuss-questions-list-page__questions-section mb-5">{MainPage}</div>
                <div className="wb-discuss-hot-today">
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