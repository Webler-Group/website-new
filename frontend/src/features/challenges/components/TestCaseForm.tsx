import { Dispatch, SetStateAction, ChangeEvent, useRef, useState } from "react";
import { Button, Form, Alert, Collapse } from "react-bootstrap";
import { FaTrash, FaPlus, FaFileUpload, FaInfoCircle } from "react-icons/fa";
import { ITestCase } from "../types";
import { genMongooseId } from "../../../utils/StringUtils";

interface ITestCaseFormProps {
  testCases: ITestCase[];
  setTestCases: Dispatch<SetStateAction<ITestCase[]>>;
}

const DELETE_MS = 300;

const TestCaseForm = ({ testCases, setTestCases }: ITestCaseFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFormatHelp, setShowFormatHelp] = useState(false);

  // Only one test case can be deleting at a time (kept outside ITestCase)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleChange = (id: string, field: keyof ITestCase, value: any) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  const addTestCase = () => {
    setTestCases((prev) => [
      ...prev,
      { id: genMongooseId(), input: "", expectedOutput: "", isHidden: true },
    ]);
  };

  const removeTestCase = (id: string) => {
    if (deletingId) return;

    setDeletingId(id);

    setTimeout(() => {
      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
      setDeletingId(null);
    }, DELETE_MS);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseTestCases(text);

      if (parsed.length > 0) {
        setTestCases((prev) => [...prev, ...parsed]);
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

    const pushCaseIfAny = () => {
      if (currentInput.length > 0 || currentOutput.length > 0) {
        cases.push({
          id: genMongooseId(),
          input: currentInput.join("\n"),
          expectedOutput: currentOutput.join("\n"),
          isHidden: true,
        });
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (/^TESTCASE$/i.test(trimmed)) {
        pushCaseIfAny();
        currentInput = [];
        currentOutput = [];
        mode = "none";
        continue;
      }

      if (/^INPUT$/i.test(trimmed)) {
        mode = "input";
        continue;
      }

      if (/^OUTPUT$/i.test(trimmed)) {
        mode = "output";
        continue;
      }

      // Preserve blank lines inside input/output?
      // Currently: ignore empty lines (matches your original behavior).
      if (trimmed === "") continue;

      if (mode === "input") currentInput.push(trimmed);
      else if (mode === "output") currentOutput.push(trimmed);
      // if mode === "none", ignore stray lines
    }

    pushCaseIfAny();
    return cases;
  };

  return (
    <div className="wb-container">
      <h5 className="mb-3">Test Cases</h5>

      <div className="d-flex flex-column gap-3">
        {testCases.map((tc, index) => {
          const isDeleting = deletingId === tc.id;

          return (
            <div
              key={tc.id}
              className={[
                "border rounded p-3 shadow-sm bg-light wb-challenges-testcase",
                isDeleting ? "wb-challenges-testcase-deleting" : "",
              ].join(" ")}
            >
              <div className="fw-semibold mb-2">Test Case #{index + 1}</div>

              <Form.Group className="mb-3" controlId={`input-${tc.id}`}>
                <Form.Label>Input</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={tc.input ?? ""}
                  placeholder="Input"
                  disabled={isDeleting}
                  onChange={(e) => handleChange(tc.id, "input", e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId={`expected-output-${tc.id}`}>
                <Form.Label>Expected Output</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={tc.expectedOutput ?? ""}
                  placeholder="Expected Output"
                  disabled={isDeleting}
                  onChange={(e) =>
                    handleChange(tc.id, "expectedOutput", e.target.value)
                  }
                />
              </Form.Group>

              <Form.Check
                type="checkbox"
                label="Hidden?"
                checked={tc.isHidden}
                disabled={isDeleting}
                onChange={(e) => handleChange(tc.id, "isHidden", e.target.checked)}
              />

              <div className="mt-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!!deletingId}
                  onClick={() => removeTestCase(tc.id)}
                >
                  <FaTrash className="me-2" />
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <Button
          variant="outline-info"
          size="sm"
          onClick={() => setShowFormatHelp((v) => !v)}
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
                • Lines under <strong>INPUT</strong> are used as input.
                <br />
                • Lines under <strong>OUTPUT</strong> are used as expected output.
                <br />
                • Each test case starts with <strong>TESTCASE</strong>.
                <br />
                • Case-insensitive keywords (e.g., “input”, “Input”, “INPUT”) are
                accepted.
              </div>
            </Alert>
          </div>
        </Collapse>
      </div>

      <div className="d-flex justify-content-end align-items-center gap-2 mt-3">
        <Form.Control
          type="file"
          accept=".txt"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
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
