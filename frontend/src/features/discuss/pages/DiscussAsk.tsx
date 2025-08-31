import { useEffect, useState } from 'react'
import { Alert, Button, FormControl, FormGroup, FormLabel, Modal } from 'react-bootstrap'
import InputTags from '../../../components/InputTags';
import { LinkContainer } from 'react-router-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../../context/apiCommunication';
import PostTextareaControl from '../../../components/PostTextareaControl';
import ReactMarkdown from "react-markdown"
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Code,
  Paperclip,
  X
} from "lucide-react"
import WAlert from '../../../components/WAlert';
import { WTextField } from '../../../components/FormField';


interface AskQuestionProps {
    questionId: string | null;
}

const AskQuestion = ({ questionId }: AskQuestionProps) => {
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);

    useEffect(() => {
        if (questionId) {
            getQuestion();
        }
    }, [questionId]);

    const getQuestion = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Discussion/GetQuestion`, "POST", { questionId });
        if (result && result.question) {
            setTitle(result.question.title);
            setMessage(result.question.message);
            setTags(result.question.tags);
        }
        setLoading(false);
    }

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        if (questionId) {
            await editQuestion();
        } else {
            await createQuestion();
        }

        setLoading(false);
    }

    const createQuestion = async () => {
        const result = await sendJsonRequest("/Discussion/CreateQuestion", "POST", { title, message, tags });
        if (result && result.question) {
            navigate("/Discuss");
        } else {
            setError(result.error ? result.error.message : result.message);
        }
    }

    const editQuestion = async () => {
        const result = await sendJsonRequest("/Discussion/EditQuestion", "PUT", { questionId, title, message, tags });
        if (result && result.success) {
            navigate("/Discuss/" + questionId);
        } else {
            setError(result.error ? result.error.message : result.message);
        }
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const handleDeletePost = async () => {
        setLoading(true);
        const result = await sendJsonRequest("/Discussion/DeleteQuestion", "DELETE", { questionId });
        if (result && result.success) {
            closeDeleteModal();
            navigate("/Discuss");
        } else {
            setError(result.error ? result.error.message : result.message);
        }
        setLoading(false);
    }

    let disabled = loading || title.trim().length == 0 || message.trim().length == 0 || tags.length == 0;

  // markdown formatting
  const applyFormat = (format: string) => {
    let newText = message;
    if (format === "bold") newText += ` **bold text**`
    if (format === "italic") newText += ` *italic text*`
    if (format === "link") newText += ` [title](https://example.com)`
    if (format === "list") newText += `\n- Item 1\n- Item 2`
    if (format === "olist") newText += `\n1. Item 1\n2. Item 2`
    if (format === "code") newText += `\n\`\`\`js\nconsole.log("hello")\n\`\`\``
    if (format === "attach") newText += `\n![alt text](image_url)`
    setMessage(newText);
  }

  return (
    <>

    {/* <Modal show={deleteModalVisiblie} onHide={closeDeleteModal} centered>
        <Modal.Header closeButton>
            <Modal.Title>Are you sure?</Modal.Title>
        </Modal.Header>
        <Modal.Body>Your question will be permanently deleted.</Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
            <Button variant="danger" onClick={handleDeletePost}>Delete</Button>
        </Modal.Footer>
    </Modal> */}

    <div className="max-w-4xl mx-auto p-6">
        {questionId === null && <h2 className="text-2xl font-bold mb-6">Ask the community a question</h2>}
        {error && <WAlert variant="danger" message={error} />}

        <div className="full m-1">
            <WTextField placeholder="What would you like to know?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <small>Tip: write as if asking a friend, being as specific as possible </small>
        </div>

      {/* Markdown Toolbar */}
      <div className="flex gap-2 mb-2 border-b pb-2">
        <button onClick={() => applyFormat("bold")} className="p-2 rounded hover:bg-gray-100">
          <Bold className="w-5 h-5" />
        </button>
        <button onClick={() => applyFormat("italic")} className="p-2 rounded hover:bg-gray-100">
          <Italic className="w-5 h-5" />
        </button>
        <button onClick={() => applyFormat("link")} className="p-2 rounded hover:bg-gray-100">
          <LinkIcon className="w-5 h-5" />
        </button>
        <button onClick={() => applyFormat("list")} className="p-2 rounded hover:bg-gray-100">
          <List className="w-5 h-5" />
        </button>
        <button onClick={() => applyFormat("olist")} className="p-2 rounded hover:bg-gray-100">
          <ListOrdered className="w-5 h-5" />
        </button>
        <button onClick={() => applyFormat("code")} className="p-2 rounded hover:bg-gray-100">
          <Code className="w-5 h-5" />
        </button>
        <button onClick={() => applyFormat("attach")} className="p-2 rounded hover:bg-gray-100">
          <Paperclip className="w-5 h-5" />
        </button>
      </div>

      {/* Markdown Editor */}
      <textarea
        className="w-full border rounded p-3 h-48 mb-4 focus:outline-none focus:ring focus:ring-blue-300"
        placeholder="Describe your question in detail..."
        rows={8}
        maxLength={4096}
        required
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/* Tags Input */}
      <div className="mb-4">
        <label className="block font-medium mb-2">Tags</label>
        <InputTags
            values={tags}
            setValues={setTags}
            placeholder="Add tag..."
        />
      </div>

      {/* Markdown Preview */}
      <div className="border rounded p-4 bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Preview</h2>
        <ReactMarkdown>{message || "*Nothing to preview yet...*"}</ReactMarkdown>
      </div>

      <Link to={questionId ? "/Discuss/" + questionId : "/Discuss"}>
        Cancel
      </Link>

    {questionId ? (
        <>
            <button     
                onClick={() => setDeleteModalVisible(true)}
                disabled={loading}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Delete
            </button>

            <button     
                onClick={handleSubmit}
                disabled={disabled} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Save changes
            </button>
        </>
        ) : (
            <button     
                onClick={handleSubmit}
                disabled={disabled} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Post Question
            </button>
            
        )}
    </div>
    </>
  )
}

export default AskQuestion
