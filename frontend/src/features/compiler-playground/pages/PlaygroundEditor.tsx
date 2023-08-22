import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CodeEditor, { Code } from "../components/CodeEditor";

interface PlaygroundEditorProps {
    type: string;
}

const PlaygroundEditor = ({ type }: PlaygroundEditorProps) => {
    const { codeId } = useParams();

    const [code, setCode] = useState<Code | null>(null);

    useEffect(() => {
        if (codeId) {

        }
        else {
            setCode({
                type,
                source: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>`,
                cssSource: "",
                jsSource: ""
            });
        }
    }, [])

    return (
        <>
            {
                code &&
                <CodeEditor code={code} />
            }
        </>
    )
}

export default PlaygroundEditor