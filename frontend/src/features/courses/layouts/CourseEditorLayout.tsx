import { Container } from "../../../components/ui";
import { ReactNode } from "react"
import { useSeo } from "../../../components/Seo";

interface CoursesEditorLayoutProps {
    MainPage: ReactNode;
}

const CoursesEditorLayout = ({ MainPage }: CoursesEditorLayoutProps) => {

    useSeo({ title: "Course Editor", noIndex: true });

    return (
        <Container>
            <div className="wb-courses-main pt-2">{MainPage}</div>
        </Container>
    );
}

export default CoursesEditorLayout;