import { ReactNode } from "react"
import PageTitle from "../../../layouts/PageTitle";
import { Container } from "react-bootstrap";

interface CoursesPageProps {
    MainPage: ReactNode;
}

const CoursesEditorPage = ({ MainPage }: CoursesPageProps) => {

    PageTitle("Course Editor", false);

    return (
        <Container>
            <div className="wb-courses-main pt-2">{MainPage}</div>
        </Container>
    );
}

export default CoursesEditorPage;