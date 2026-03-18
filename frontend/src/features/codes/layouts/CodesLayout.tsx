import { Container } from "react-bootstrap";
import { ReactNode, useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import Code from "../components/Code";
import { Helmet } from "react-helmet-async";
import { CodeMinimal, CodesListData } from "../types";
import { UserMinimal } from "../../profile/types";
import { FaFire } from "react-icons/fa";

interface CodesLayoutProps {
    MainPage: ReactNode
}

const CodesLayout = ({ MainPage }: CodesLayoutProps) => {

    const { sendJsonRequest } = useApi();
    const [codes, setCodes] = useState<CodeMinimal<UserMinimal>[]>([]);

    useEffect(() => {
        getCodes();
    }, []);

    const getCodes = async () => {
        const result = await sendJsonRequest<CodesListData>(`/Codes`, "POST", {
            page: 1,
            count: 10,
            filter: 5,
            searchQuery: "",
            userId: null
        });
        if (result.data) {
            setCodes(result.data.codes);
        }
    }

    return (
        <>
            <Helmet> <title>Code Playground | Webler Codes</title> <meta name="description" content="Experiment with code in multiple programming languages using Webler’s browser-based IDE. No setup required — just create, edit, and run instantly." /> </Helmet>
            <Container>
                <div className="row mt-2" style={{ minHeight: "100vh" }}>
                    <div className="col-12 col-md-8">{MainPage}</div>
                    <div className="col-12 col-md-4">
                        <div className="wb-codes-sidebar-card">
                            <div className="wb-codes-sidebar-header">
                                <span className="text-danger"><FaFire /></span>
                                <h5>Hot today</h5>
                            </div>
                            <div className="wb-codes-sidebar-content">
                                {
                                    codes.map(code => {
                                        return (
                                            <div key={code.id}>
                                                <Code 
                                                    code={code} 
                                                    searchQuery="" 
                                                    variant="compact"
                                                />
                                            </div>
                                        );
                                    })
                                }
                                {codes.length === 0 && (
                                    <div className="p-4 text-center text-muted">
                                        <small>No trending codes yet</small>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </>
    )
}

export default CodesLayout;