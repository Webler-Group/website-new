import { Dispatch, SetStateAction, ChangeEvent, useRef, useState } from "react";
import { Button, Form, Alert, Collapse } from "react-bootstrap";
import { FaTrash, FaPlus, FaFileUpload, FaInfoCircle } from "react-icons/fa";
import { ITestCase } from "../types";

interface ITestCaseFormProps {
  testCases: ITestCase[];
  setTestCases: Dispatch<SetStateAction<ITestCase[]>>;
}

const TestCaseForm = ({ testCases, setTestCases }: ITestCaseFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFormatHelp, setShowFormatHelp] = useState(false);

  const handleChange = (index: number, field: keyof ITestCase, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "", isHidden: true }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseTestCases(text);
      if (parsed.length > 0) {
        setTestCases([...testCases, ...parsed]);
      } else {
        alert("No valid test cases found in file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const parseTestCases = (text: string): ITestCase[] => {
    const lines = text.split(/\r?\n/);
    const cases: ITestCase[] = [];

    let currentInput: string[] = [];
    let currentOutput: string[] = [];
    let mode: "none" | "input" | "output" = "none";

    for (const line of lines) {
      const trimmed = line.trim();

      if (/^TESTCASE$/i.test(trimmed)) {
        if (currentInput.length > 0 || currentOutput.length > 0) {
          cases.push({
            input: currentInput.join("\n"),
            expectedOutput: currentOutput.join("\n"),
            isHidden: true,
          });
        }
        currentInput = [];
        currentOutput = [];
        mode = "none";
      } else if (/^INPUT$/i.test(trimmed)) {
        mode = "input";
      } else if (/^OUTPUT$/i.test(trimmed)) {
        mode = "output";
      } else if (trimmed !== "") {
        if (mode === "input") currentInput.push(trimmed);
        else if (mode === "output") currentOutput.push(trimmed);
      }
    }

    if (currentInput.length > 0 || currentOutput.length > 0) {
      cases.push({
        input: currentInput.join("\n"),
        expectedOutput: currentOutput.join("\n"),
        isHidden: true,
      });
    }

    return cases;
  };

  return (
    <div>
      <h5 className="mb-3">Test Cases</h5>

      <div className="d-flex flex-column gap-3">
        {testCases.map((tc, index) => (
          <div key={index} className="border rounded p-3 shadow-sm bg-light">
            <div className="fw-semibold mb-2">Test Case #{index + 1}</div>

            <Form.Group className="mb-3" controlId={`input${index}`}>
              <Form.Label>Input</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={tc.input}
                placeholder="Input"
                onChange={(e) => handleChange(index, "input", e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId={`expected-output${index}`}>
              <Form.Label>Expected Output</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={tc.expectedOutput}
                placeholder="Expected Output"
                onChange={(e) =>
                  handleChange(index, "expectedOutput", e.target.value)
                }
              />
            </Form.Group>

            <Form.Check
              type="checkbox"
              label="Hidden?"
              checked={tc.isHidden}
              onChange={(e) => handleChange(index, "isHidden", e.target.checked)}
            />

            <div className="mt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeTestCase(index)}
              >
                <FaTrash className="me-2" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* File format info toggle */}
      <div className="mt-4">
        <Button
          variant="outline-info"
          size="sm"
          onClick={() => setShowFormatHelp(!showFormatHelp)}
          aria-controls="format-help"
          aria-expanded={showFormatHelp}
        >
          <FaInfoCircle className="me-2" />
          Show File Format
        </Button>

        <Collapse in={showFormatHelp}>
          <div id="format-help" className="mt-2">
            <Alert variant="info" className="mb-0">
              <div className="fw-semibold mb-2">Expected file format (.txt):</div>
              <pre className="bg-light p-2 rounded small mb-0">
{`TESTCASE
INPUT
1 2
3 4
OUTPUT
4
TESTCASE
INPUT
hello
OUTPUT
world`}
              </pre>
              <div className="mt-2 small text-muted">
                • Lines under <strong>INPUT</strong> are used as input.<br />
                • Lines under <strong>OUTPUT</strong> are used as expected output.<br />
                • Each test case starts with <strong>TESTCASE</strong>.<br />
                • Case-insensitive keywords (e.g., “input”, “Input”, “INPUT”) are accepted.
              </div>
            </Alert>
          </div>
        </Collapse>
      </div>

      {/* Bottom control buttons */}
      <div className="d-flex justify-content-end align-items-center gap-2 mt-3">
        <Form.Control
          type="file"
          accept=".txt"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

        <Button
          variant="primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <FaFileUpload className="me-2" />
          Load from File
        </Button>

        <Button variant="success" onClick={addTestCase}>
          <FaPlus className="me-2" />
          Add TestCase
        </Button>
      </div>
    </div>
  );
};

export default TestCaseForm;
