import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";
import { ReactNode } from "react";

interface DiscussProps {
    MainPage: ReactNode
}

const Discuss = ({ MainPage }: DiscussProps) => {

    PageTitle("Webler - Discuss", false);

    return (
        <>
            <Container>
                <div className="d-block d-lg-flex p-4">
                    <div className="wb-discuss-questions-list-page__questions-section">{MainPage}</div>
                    <div className="wb-discuss-hot-today">
                        <h2>Hot today</h2>
                    </div>
                </div>
            </Container>
        </>
    )
}

export default Discuss;