import { useEffect, useState } from "react";
import { ICourse } from "../components/Course";
import { Button, Form, FormControl, FormGroup, FormLabel, Modal } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import Lesson, { ILesson } from "../components/Lesson";
import LessonEditor from "./LessonEditor";
import { useApi } from "../../../context/apiCommunication";

interface CourseEditorProps {
}

const CourseEditor = ({ }: CourseEditorProps) => {
    const { sendJsonRequest } = useApi();
    const { courseCode, lessonId } = useParams();

    const [course, setCourse] = useState<ICourse | null>(null);
    const [lessons, setLessons] = useState<ILesson[]>([]);
    const [loading, setLoading] = useState(false);
    const [formVisible, setFormVisible] = useState(false);
    const [formInput, setFormInput] = useState("");
    const [editedLessonId, setEditedLessonId] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

    useEffect(() => {
        getCourse(true);
    }, [courseCode]);

    const getCourse = async (includeLessons: boolean) => {
        setLoading(true);
        const result = await sendJsonRequest(`/CourseEditor/GetCourse`, "POST", { courseCode, includeLessons });
        if (result && result.course) {
            setCourse(result.course);
            setLessons(result.course.lessons);
        }
        setLoading(false);
    }

    const showLessonForm = (input: string, lessonId: string | null) => {
        setFormInput(input);
        setFormVisible(true);
        setEditedLessonId(lessonId);
    }

    const hideLessonForm = () => {
        setFormVisible(false);
        setFormInput("");
    }

    const handleCreateLesson = async () => {
        setLoading(true)
        const result = await sendJsonRequest(`/CourseEditor/CreateLesson`, "POST", {
            courseId: course!.id,
            title: formInput
        });
        if (result && result.lesson) {
            setLessons(lessons => [...lessons, { ...result.lesson }]);
            hideLessonForm();
        }
        setLoading(false);
    }

    const handleEditLesson = async () => {
        setLoading(true);
        const lesson = lessons.find(lesson => lesson.id === editedLessonId);
        if (!lesson) {
            return;
        }

        const result = await sendJsonRequest(`/CourseEditor/EditLesson`, "PUT", {
            lessonId: editedLessonId,
            title: formInput,
            index: lesson.index
        });
        if (result && result.success) {
            setLessons((lessons) => {
                let currentLessons = [...lessons];
                for (let i = 0; i < currentLessons.length; ++i) {
                    if (currentLessons[i].id === editedLessonId) {
                        currentLessons[i].title = result.data.title;
                    }
                }
                return currentLessons;
            });
            hideLessonForm();
        }
        setLoading(false);
    }

    const handleDeleteLesson = async () => {
        setLoading(true);
        const result = await sendJsonRequest("/CourseEditor/DeleteLesson", "DELETE", { lessonId: editedLessonId });
        if (result && result.success) {
            closeDeleteModal();
            setLessons((lessons) => {
                let newLessons = [];
                let deletedFound = false;
                for (let i = 0; i < lessons.length; ++i) {
                    const lesson = lessons[i];
                    if (lesson.id === editedLessonId) {
                        deletedFound = true;
                        continue;
                    }
                    if (deletedFound) {
                        --lesson.index;
                    }
                    newLessons.push(lesson);
                }
                return newLessons;
            });
        }
        setLoading(false);
    }

    const handleChangeLessonIndex = async (lessonId: string, newIndex: number) => {
        setLoading(true);

        const result = await sendJsonRequest("/CourseEditor/ChangeLessonIndex", "POST", { lessonId, newIndex });
        if (result && result.success) {
            setLessons((prevLessons) => {
                const lessonsCopy = [...prevLessons];

                const currentIndex = lessonsCopy.findIndex(l => l.id === lessonId);
                if (currentIndex === -1) return lessonsCopy;

                // Swap lessons
                const targetIndex = lessonsCopy.findIndex(l => l.index === newIndex);
                if (targetIndex === -1) return lessonsCopy;

                // Swap indexes
                [lessonsCopy[currentIndex].index, lessonsCopy[targetIndex].index] = [lessonsCopy[targetIndex].index, lessonsCopy[currentIndex].index];

                // Sort by index to keep order consistent
                lessonsCopy.sort((a, b) => a.index - b.index);

                return lessonsCopy;
            });
        }

        setLoading(false);
    };


    const onEdit = (id: string, title: string) => {
        showLessonForm(title, id);
    }

    const onDelete = (id: string) => {
        setEditedLessonId(id);
        setDeleteModalVisible(true);
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const getLessonTitlePath = () => {
        const currentLesson = lessons.find(x => x.id === lessonId);
        if (!currentLesson) {
            return <></>;
        }
        const lessonTitle = currentLesson.title.length > 20 ? currentLesson.title.slice(0, 20) + "..." : currentLesson.title;
        return (
            <>
                <span>&rsaquo;</span>
                <span>{lessonTitle}</span>
            </>
        );
    }

    return (
        course !== null &&
        <>
            <Modal show={deleteModalVisible} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Lesson will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteLesson}>Delete</Button>
                </Modal.Footer>
            </Modal>
            <div className="d-flex gap-2 py-2">
                <Link to="/Courses/Editor">Course Editor</Link>
                <span>&rsaquo;</span>
                {
                    lessonId !== null ?
                        <>
                            <Link to={"/Courses/Editor/" + course.code}>{course.title.length > 20 ? course.title.slice(0, 20) + "..." : course.title}</Link>
                            {getLessonTitlePath()}
                        </>
                        :
                        <span>{course.title.length > 20 ? course.title.slice(0, 20) + "..." : course.title}</span>
                }
            </div>
            <div className="mb-3">
                <h3 className="wb-courses-course__title" style={{ wordBreak: "break-word" }}>{course.title}</h3>
            </div>
            <div hidden={!formVisible} className="mb-2 border bg-white rounded p-2">
                <Form>
                    <h4>{editedLessonId === null ? "New lesson" : "Edit lesson"}</h4>
                    <FormGroup>
                        <FormLabel>Title</FormLabel>
                        <FormControl type="text" placeholder="Enter lesson title" value={formInput} onChange={(e) => setFormInput(e.target.value)} />
                    </FormGroup>
                    <div className="d-flex justify-content-end mt-2">
                        <Button size="sm" variant="secondary" disabled={loading} onClick={() => hideLessonForm()}>Cancel</Button>
                        {
                            editedLessonId === null ?
                                <Button size="sm" variant="primary" className="ms-2" onClick={handleCreateLesson} disabled={loading || formInput.length === 0}>Create</Button>
                                :
                                <Button size="sm" variant="primary" className="ms-2" onClick={handleEditLesson} disabled={loading}>Save</Button>
                        }
                    </div>
                </Form>
            </div>
            {
                lessonId ?
                    <LessonEditor lessonId={lessonId} />
                    :
                    <>
                        <div className="d-flex justify-content-end">
                            <Button className="ms-2 btn btn-primary btn-sm" onClick={() => showLessonForm("", null)}>Create Lesson</Button>
                        </div>
                        <div className="mt-3">
                            {
                                lessons.map(lesson => {
                                    return (
                                        <div key={lesson.index} className="mt-2">
                                            <Lesson
                                                lesson={lesson}
                                                courseCode={course.code}
                                                onDelete={onDelete}
                                                onEdit={onEdit}
                                                onChangeIndex={handleChangeLessonIndex}
                                                isFirst={lesson.index === 1}
                                                isLast={lesson.index === lessons.length}
                                            />
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </>
            }
        </>
    );
}

export default CourseEditor;