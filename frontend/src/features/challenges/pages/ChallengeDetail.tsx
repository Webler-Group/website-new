import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Tab,
  Nav,
  ListGroup,
  Badge,
} from "react-bootstrap";
import { FaCheckCircle, FaTimesCircle, FaCode, FaInfoCircle } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import IChallenge, { ITestCase } from "../IChallenge";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import allowedUrls from "../../../data/discussAllowedUrls";
import PlaygroundEditor from "../../compiler-playground/pages/PlaygroundEditor";

// Dummy test results
// const testCases = [
//   { id: 1, input: "nums=[2,7,11,15], target=9", output: "[0,1]", passed: true },
//   { id: 2, input: "nums=[3,2,4], target=6", output: "[1,2]", passed: true },
//   { id: 3, input: "nums=[3,3], target=6", output: "[0,1]", passed: false },
//   { id: 4, input: "nums=[1,2,3], target=5", output: "N/A", passed: true },
//   { id: 5, input: "nums=[10,20], target=40", output: "N/A", passed: false },
//   { id: 6, input: "nums=[5,5,5], target=10", output: "[0,1]", passed: true },
// ];

function ChallengeDetails() {
  const { sendJsonRequest } = useApi();
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<IChallenge | null>(null);
  const [testCases, setTestCases] = useState<ITestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getChallenge();
  }, [challengeId]);

  const getChallenge = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Challenge/GetChallenge`, "POST", {
            challengeId
        });
        setLoading(false);
        if (result.success) {
          setChallenge(result.challenge);
          setTestCases(result.challenge.testCases);
        } else {
            navigate("/PageNotFound")
        }
        
    }

  const handleSubmit = () => {
    // setShowModal(true);
    // console.log(testCases);
    
  };

  return (
    <Container fluid className="py-4">
      {/* For desktop/laptops -> side by side */}
      <Row className="d-none d-md-flex">
        <Col md={6}>
          <Card className="p-3 shadow">
            <h4>
              <FaInfoCircle className="me-2 text-primary" /> { challenge?.title }
            </h4>
            <div>
              {
                challenge && 
                <MarkdownRenderer content={(challenge?.description as string)} allowedUrls={allowedUrls} />
              }
            </div>
            <p className="bg-success-subtle text-success m-1 p-1 rounded fw-bold">+{challenge?.xp} XP Reward</p>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="p-3 shadow">
            <h4>
              <FaCode className="me-2 text-success" /> Code Editor
            </h4>
            {/* <PlaygroundEditor language={"python"} /> */}
            <div className="d-flex justify-content-end mt-3">
              <Button onClick={handleSubmit} variant="primary">
                Submit
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* For mobile -> tabs */}
      <div className="d-md-none">
        <Tab.Container defaultActiveKey="description">
          <Nav variant="tabs">
            <Nav.Item>
              <Nav.Link eventKey="description">Description</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="editor">Code</Nav.Link>
            </Nav.Item>
          </Nav>
          <Tab.Content className="mt-3">
            <Tab.Pane eventKey="description">
              <Card className="p-3 shadow">
                <h5>{challenge?.title}</h5>
                <p>{challenge?.description}</p>
              </Card>
            </Tab.Pane>
            <Tab.Pane eventKey="editor">
              <Card className="p-3 shadow">
                <h5>Code Editor Playground</h5>
                <PlaygroundEditor language={"python"} />
                <div className="d-flex justify-content-end mt-3">
                  <Button onClick={handleSubmit} variant="primary">
                    Submit
                  </Button>
                </div>
              </Card>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </div>

      {/* Modal for test results */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Test Case Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup>
            {testCases.map((tc, idx) => (
              <ListGroup.Item key={idx} className="d-flex justify-content-between">
                <div>
                  <strong>Input:</strong> {tc.input} <br />
                  <strong>Expected Output:</strong> {tc.expectedOutput}
                </div>
                <div>
                  {tc.passed ? (
                    <Badge bg="success">
                      <FaCheckCircle className="me-1" /> Passed
                    </Badge>
                  ) : (
                    <Badge bg="danger">
                      <FaTimesCircle className="me-1" /> Failed
                    </Badge>
                  )}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}


export default ChallengeDetails;