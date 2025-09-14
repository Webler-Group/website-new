import { useState } from "react";
import { Form, Button, Card, Row, Col } from "react-bootstrap";
import { FaPlus, FaTags, FaAlignLeft, FaLevelUpAlt } from "react-icons/fa";
import InputTags from "../../../components/InputTags";
import { useApi } from '../../../context/apiCommunication';
import { useNavigate } from "react-router-dom";
import TestCaseForm, { ITestCase } from "../components/TestCaseForm";

const ChallengeCreate = () => {

  const { sendJsonRequest } = useApi();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [xp, setXP] = useState(10);
  const [error, setError] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitBtnDisabled, setSubmitBtnDisabled] = useState(false);

  const [testCases, setTestCases] = useState<ITestCase[]>([
    { input: "", expectedOutput: "", isHidden: true },
  ]);

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitBtnDisabled(true);

    const result = await sendJsonRequest(`/Challenge/Create`, "POST", { 
        title,
        description,
        difficulty,
        tags,
        testCases, 
        xp
    });

    setSubmitBtnDisabled(false);

    if(result) {

      if(!result.success) {
        setError(result.message);
        return;
      }
      navigate("../");
    } else {
      setError("Something went wrong while creating challenges");
    }

  };

  return (
    <Card className="p-4 shadow">
      <h4 className="mb-3">
        <FaPlus className="me-2" /> Create New Challenge
      </h4>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter challenge title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            <FaAlignLeft className="me-2" /> Description
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            placeholder="Describe the challenge..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Form.Group>

        <Col>
          <TestCaseForm testCases={testCases} setTestCases={setTestCases} />
        </Col>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                <FaLevelUpAlt className="me-2" /> Difficulty
              </Form.Label>
              <Form.Select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                <FaTags className="me-2" /> Tags
              </Form.Label>
              <InputTags
                  values={tags}
                  setValues={setTags}
                  placeholder="Add tag..."
              />
            </Form.Group>
          </Col>
            
          <Col className="m-1">
            <h4>XP</h4>
            <Form.Control
              type="number"
              min = {10}
              placeholder=""
              value={xp}
              onChange={(e) => setXP(parseInt(e.target.value))}
            />
          </Col>

            <p className="col text-danger">{error}</p>
        </Row>

        <Button type="submit" variant="primary" disabled={submitBtnDisabled}>
          <FaPlus className="me-2" /> {
            submitBtnDisabled ? "Waiting..." : "Create Challenge"
          }
        </Button>
      </Form>
    </Card>
  );
}


export default ChallengeCreate;