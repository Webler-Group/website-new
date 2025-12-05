import { useParams } from "react-router-dom";
import CreateCoursePage from "./CreateCoursePage";

const EditCoursePage = () => {
    const { courseId } = useParams();

    return (
        <CreateCoursePage courseId={courseId!} />
    );
}

export default EditCoursePage;