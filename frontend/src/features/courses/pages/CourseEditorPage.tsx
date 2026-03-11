import { useEffect, useState } from "react";
import { Button, Form, FormControl, FormGroup, FormLabel, Modal } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import Lesson from "../components/Lesson";
import LessonEditor from "../components/LessonEditor";
import { useApi } from "../../../context/apiCommunication";
import { sanitizeFilename, truncate } from "../../../utils/StringUtils";
import NotificationToast from "../../../components/NotificationToast";
import Loader from "../../../components/Loader";
import { downloadJsonFile } from "../../../utils/FileUtils";
import { CourseMinimal, EditorCreateLessonData, EditorEditLessonData, EditorExportCourseData, EditorExportCourseLessonData, EditorGetCourseData, LessonDetails } from "../types";

const CourseEditorPage = () => {
    const { sendJsonRequest } = useApi();
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState<CourseMinimal | null>(null);
    const [lessons, setLessons] = useState<LessonDetails<undefined>[]>([]);
    const [loading, setLoading] = useState(false);
    const [formVisible, setFormVisible] = useState(false);
    const [formInput, setFormInput] = useState("");
    const [editedLessonId, setEditedLessonId] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string; } | null>(null);

    useEffect(() => {
        getCourse(true);
    }, [courseId]);

    const getCourse = async (includeLessons: boolean) => {
        setLoading(true);
        const result = await sendJsonRequest<EditorGetCourseData>(`/CourseEditor/GetCourse`, "POST", { courseId, includeLessons });
        if (result.data) {
            setCourse(result.data.course);
            setLessons(result.data.course.lessons);
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
        const result = await sendJsonRequest<EditorCreateLessonData>(`/CourseEditor/CreateLesson`, "POST", {
            courseId: course!.id,
            title: formInput
        });
        if (result.data) {
            const newLesson: LessonDetails<undefined> = { ...result.data.lesson, comments: 0, nodeCount: 0, nodes: [], userProgress: undefined };
            setLessons(prev => [...prev, newLesson]);
            hideLessonForm();
            setNotification({ type: "success", message: "Lesson created successfully" });
        } else {
            setNotification({ type: "error", message: result.error?.[0].message ?? "Failed to create lesson" });
        }
        setLoading(false);
    }

    const handleEditLesson = async () => {
        setLoading(true);
        const lesson = lessons.find(lesson => lesson.id === editedLessonId);
        if (!lesson) {
            return;
        }

        const result = await sendJsonRequest<EditorEditLessonData>(`/CourseEditor/EditLesson`, "PUT", {
            lessonId: editedLessonId,
            title: formInput,
            index: lesson.index
        });
        if (result.data) {
            setLessons((prev) => prev.map(x => x.id === result.data!.id ? { ...x, ...result.data } : x));
            hideLessonForm();
            setNotification({ type: "success", message: "Lesson edited successfully" });
        } else {
            setNotification({ type: "error", message: result.error?.[0].message ?? "Failed to edit lesson" });
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
            setNotification({ type: "success", message: "Lesson deleted successfully" });
        } else {
            setNotification({ type: "error", message: result.error?.[0].message ?? "Failed to delete lesson" });
        }
        setLoading(false);
    }

    const handleChangeLessonIndex = async (lessonId: string, newIndex: number) => {
        setLoading(true);

        const result = await sendJsonRequest("/CourseEditor/ChangeLessonIndex", "POST", { lessonId, newIndex });
        if (result.success) {
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
            setNotification({ type: "success", message: "Lesson index changed successfully" });
        } else {
            setNotification({ type: "error", message: result.error?.[0].message ?? "Failed to change lesson index" });
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

    const onExport = async (id: string, title: string) => {
        setLoading(true);

        const result = await sendJsonRequest<EditorExportCourseLessonData>("/CourseEditor/ExportCourseLesson", "POST", { lessonId: id });

        if (result && result.success && result.data) {
            const fileName = `${sanitizeFilename(title)}.json`;
            downloadJsonFile(fileName, result.data);
            setNotification({ type: "success", message: "Lesson exported" });
        } else {
            setNotification({ type: "error", message: result?.error?.[0]?.message ?? "Export failed" });
        }

        setLoading(false);
    };

    const handleExportCourse = async () => {
        setLoading(true);
        const result = await sendJsonRequest<EditorExportCourseData>("/CourseEditor/ExportCourse", "POST", { courseId });
        if (result && result.success && result.data) {
            downloadJsonFile(`${result.data.course.code}-export.json`, result.data.course);
            setNotification({ type: "success", message: "Course exported" });
        } else {
            setNotification({ type: "error", message: result.error?.[0]?.message ?? "Export failed" });
        }
        setLoading(false);
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const getLessonTitlePath = () => {
        const currentLesson = lessons.find(x => x.id === lessonId);
        if (!currentLesson) {
            return <></>;
        }
        const lessonTitle = truncate(currentLesson.title, 20);
        return (
            <>
                <span>&rsaquo;</span>
                <span>{lessonTitle}</span>
            </>
        );
    }

    const handleEditDetails = () => {
        navigate("/Courses/Editor/Edit/" + courseId);
    }

    return (
        course !== null ?
            <>
                <NotificationToast notification={notification} onClose={() => setNotification(null)} />
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
                                <Link to={"/Courses/Editor/" + course.id}>{truncate(course.title, 20)}</Link>
                                {getLessonTitlePath()}
                            </>
                            :
                            <span>{truncate(course.title, 20)}</span>
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
                            <FormControl type="text" placeholder="Enter lesson title" maxLength={60} value={formInput} onChange={(e) => setFormInput(e.target.value)} />
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
                            <div className="d-flex justify-content-between">
                                <div>
                                    <Button variant="primary" size="sm" onClick={handleEditDetails} disabled={loading}>Edit</Button>
                                </div>
                                <div className="d-flex justify-content-end gap-2">
                                    <Button variant="primary" size="sm" onClick={handleExportCourse} disabled={loading}>Export to JSON</Button>
                                    <Button variant="primary" size="sm" onClick={() => showLessonForm("", null)} disabled={loading}>Create Lesson</Button>
                                </div>
                            </div>
                            <div className="mt-3">
                                {
                                    lessons.map(lesson => {
                                        return (
                                            <div key={lesson.index} className="mt-2">
                                                <Lesson
                                                    lesson={lesson}
                                                    courseId={course.id}
                                                    onDelete={onDelete}
                                                    onEdit={onEdit}
                                                    onChangeIndex={handleChangeLessonIndex}
                                                    onExport={onExport}
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
            :
            <div className="my-5 text-center">
                {
                    loading ?
                        <Loader /> :
                        <div>
                            <p className="mb-2">Course could not be loaded</p>
                            <Link to="/Courses/Editor">Back</Link>
                        </div>
                }
            </div>
    );
}

export default CourseEditorPage;
