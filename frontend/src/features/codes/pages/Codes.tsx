import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";
import { ReactNode, useEffect, useState } from "react";
import {useApi} from "../../../context/apiCommunication";
import Code, { ICode } from "../components/Code";

interface CodesProps {
    MainPage: ReactNode
}

const Codes = ({ MainPage }: CodesProps) => {
    PageTitle("Webler - Codes", false);

    const { sendJsonRequest } = useApi();
    const [codes, setCodes] = useState<ICode[]>([]);

    useEffect(() => {
        getCodes();
    }, []);

    const getCodes = async () => {
        const result = await sendJsonRequest(`/Codes`, "POST", {
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
                                    <div className="mt-2" key={code.id}>
                                        <Code code={code} searchQuery="" showUserProfile={false} />
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