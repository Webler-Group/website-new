import { Dispatch, SetStateAction } from "react";
import { Button, Form, Card, Row, Col } from "react-bootstrap";
import { FaTrash, FaPlus } from "react-icons/fa";
import { IChallengeTemplate } from "../IChallenge";

interface IChallengeLangFormProps {
    languages: IChallengeTemplate[];
    setLanguages: Dispatch<SetStateAction<IChallengeTemplate[]>>;
}


const ChallengeTemplateForm = ({ languages, setLanguages }: IChallengeLangFormProps) => {

  const handleChange = (index: number, field: keyof IChallengeTemplate, value: any) => {
    const updated = [...languages];
    // @ts-ignore
    updated[index][field] = value;
    setLanguages(updated);
  };

  const addLanguage = () => {
    setLanguages([...languages, { name: "", source: "" }]);
  };

  const removeLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h5 className="mb-3">Templates</h5>
      <Row>
      {languages.map((tc, index) => (
        <Card key={index} className="mb-2 shadow-sm">
          <Card.Body>
            <Row className="g-2 align-items-center">
              <Col md={4}>
                <Form.Group>
                  <Form.Control
                    type="text"
                    value={tc.name}
                    placeholder="name"
                    onChange={(e) =>
                      handleChange(index, "name", e.target.value)
                    }
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                    <textarea
                      value={tc.source}
                      placeholder="source"
                      onChange={(e) =>
                        handleChange(index, "source", e.target.value)
                      }

                      style={{ width: "200px", height: "200px" }}
                    >
                  </textarea>
                  </Form.Group>
              </Col>

              <Col md={2} className="text-end">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeLanguage(index)}
                >
                  <FaTrash />
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      ))}
    </Row>
      <Button variant="success" onClick={addLanguage} className="m-2">
        <FaPlus className="me-2" />
        Add Template
      </Button>
    </div>
  );
};

export default ChallengeTemplateForm;
