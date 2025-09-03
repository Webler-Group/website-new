import { useParams } from "react-router-dom";
import CreateCourse from "./CreateCourse";

const EditCourse = () => {
    const { courseId } = useParams();

    return (
        <CreateCourse courseId={courseId!} />
    );
}

export default EditCourse;