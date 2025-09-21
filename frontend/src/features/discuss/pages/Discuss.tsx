import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";
import { ReactNode, useEffect, useState } from "react";
import Question, { IQuestion } from "../components/Question";
import { useApi } from "../../../context/apiCommunication";

interface DiscussProps {
    MainPage: ReactNode
}

const Discuss = ({ MainPage }: DiscussProps) => {
    PageTitle("Q&A Discussions | Webler Codes", false);

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
        <div className="bg-white">
            <Container>
                <div className="wb-discuss-questions-list-page row pt-2">
                    <div className="col-12 col-md-8">{MainPage}</div>
                    <div className="col-12 col-md-4">
                        <h2>Hot today</h2>
                        <div className="my-3">
                            {
                                questions.map(question => {
                                    return (
                                        <div className="mb-2" key={question.id}>
                                            <Question question={question} searchQuery="" showUserProfile={false} />
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}

export default Discuss;