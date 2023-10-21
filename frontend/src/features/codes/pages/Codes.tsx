import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";
import { ReactNode, useEffect, useState } from "react";
import ApiCommunication from "../../../helpers/apiCommunication";
import { FaComment, FaThumbsUp } from "react-icons/fa";
import { Link } from "react-router-dom";
import { ICode } from "../components/Code";

interface CodesProps {
    MainPage: ReactNode
}

const Codes = ({ MainPage }: CodesProps) => {

    PageTitle("Webler - Codes", false);

    const [codes, setCodes] = useState<ICode[]>([]);

    useEffect(() => {
        getCodes();
    }, []);

    const getCodes = async () => {
        const result = await ApiCommunication.sendJsonRequest(`/Codes`, "POST", {
            page: 1,
            count: 10,
            filter: 5,
            searchQuery: "",
            language: "",
            userId: null
        });
        if (result && result.codes) {
            setCodes(result.codes);
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
                            codes.map(code => {
                                return (
                                    <div key={code.id} className="rounded border bg-white p-2 mb-2">
                                        <Link to={"/Compiler-Playground/" + code.id}>
                                            <h5>{code.name}</h5>
                                        </Link>
                                        <div className="d-flex small">
                                            <div className="me-3 d-flex align-items-center">
                                                <FaThumbsUp />
                                                <span className="ms-2">{code.votes} Votes</span>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <FaComment />
                                                <span className="ms-2">{code.comments} Comments</span>
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

export default Codes;