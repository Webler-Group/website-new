import { Container } from "react-bootstrap";
import { ReactNode, useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import Code, { ICode } from "../components/Code";
import { Helmet } from "react-helmet-async";

interface CodesLayoutProps {
    MainPage: ReactNode
}

const CodesLayout = ({ MainPage }: CodesLayoutProps) => {

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
            userId: null
        });
        if (result && result.codes) {
            setCodes(result.codes);
        }
    }

    return (
        <>
            <Helmet> <title>Code Playground | Webler Codes</title> <meta name="description" content="Experiment with code in multiple programming languages using Webler’s browser-based IDE. No setup required — just create, edit, and run instantly." /> </Helmet>
            <Container>
                <div className="row mt-2" style={{ minHeight: "100vh" }}>
                    <div className="col-12 col-md-8">{MainPage}</div>
                    <div className="col-12 col-md-4">
                        <h2>Hot today</h2>
                        <div className="my-3">
                            {
                                codes.map(code => {
                                    return (
                                        <div className="mb-2" key={code.id}>
                                            <Code code={code} searchQuery="" showUserProfile={false} />
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            </Container>
        </>
    )
}

export default CodesLayout;