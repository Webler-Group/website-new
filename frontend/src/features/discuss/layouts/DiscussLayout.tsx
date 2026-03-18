import { Container } from "react-bootstrap";
import { ReactNode, useEffect, useState } from "react";
import Question from "../components/Question";
import { useApi } from "../../../context/apiCommunication";
import { Helmet } from "react-helmet-async";
import { QuestionListData, QuestionMinimal } from "../types";
import { UserMinimal } from "../../profile/types";
import { FaFire } from "react-icons/fa6";

interface DiscussLayoutProps {
    MainPage: ReactNode
}

const DiscussLayout = ({ MainPage }: DiscussLayoutProps) => {
    const { sendJsonRequest } = useApi();
    const [questions, setQuestions] = useState<QuestionMinimal<UserMinimal>[]>([]);

    useEffect(() => {
        getQuestions();
    }, []);

    const getQuestions = async () => {
        const result = await sendJsonRequest<QuestionListData>(`/Discussion`, "POST", {
            page: 1,
            count: 10,
            searchQuery: "",
            filter: 5,
            userId: null
        });
        if (result.data) {
            setQuestions(result.data.questions);
        }
    }

    return (
        <>
            <Helmet> <title>Q&A Discussions | Webler Codes</title> <meta name="description" content="Join Webler’s programming forum to ask questions, share knowledge, and solve real-world coding challenges with a global community of developers." /> </Helmet>
            <div className="bg-white">
                <Container>
                    <div className="row pt-2" style={{ minHeight: "100vh" }}>
                        <div className="col-12 col-md-8">{MainPage}</div>
                        <div className="col-12 col-md-4 mb-4">
                            <div className="wb-discuss-sidebar-card">
                                <div className="wb-discuss-sidebar-header">
                                    <span className="text-danger"><FaFire /></span>
                                    <h5>Hot today</h5>
                                </div>
                                <div className="wb-discuss-sidebar-content">
                                    {
                                        questions.map(question => {
                                            return (
                                                <div key={question.id}>
                                                    <Question 
                                                        question={question} 
                                                        searchQuery="" 
                                                        showUserProfile={false} 
                                                        variant="compact"
                                                    />
                                                </div>
                                            );
                                        })
                                    }
                                    {questions.length === 0 && (
                                        <div className="p-4 text-center text-muted">
                                            <small>No trending questions yet</small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        </>
    )
}

export default DiscussLayout;