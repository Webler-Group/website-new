import { Container } from "../../../components/ui";
import { ReactNode } from "react"
import PageTitle from "../../../layouts/PageTitle";

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