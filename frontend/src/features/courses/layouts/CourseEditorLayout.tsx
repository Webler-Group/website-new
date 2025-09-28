import { ReactNode } from "react"
import PageTitle from "../../../layouts/PageTitle";
import { Container } from "react-bootstrap";

interface CoursesEditorLayoutProps {
    MainPage: ReactNode;
}

const CoursesEditorLayout = ({ MainPage }: CoursesEditorLayoutProps) => {

    PageTitle("Course Editor", false);

    return (
        <Container>
            <div className="wb-courses-main pt-2">{MainPage}</div>
        </Container>
    );
}

export default CoursesEditorLayout;