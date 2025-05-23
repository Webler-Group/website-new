import { ReactNode } from "react"
import PageTitle from "../../../layouts/PageTitle";
import { Container } from "react-bootstrap";

interface CoursesPageProps {
    MainPage: ReactNode;
}

const CoursesEditorPage = ({ MainPage }: CoursesPageProps) => {

    PageTitle("Webler - Course Editor", false);

    return (
        <Container>
            <div className="wb-courses-main p-4">{MainPage}</div>
        </Container>
    );
}

export default CoursesEditorPage;