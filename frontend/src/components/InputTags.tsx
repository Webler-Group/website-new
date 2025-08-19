import { useState } from 'react';
import { Badge, Button, FormControl } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa6';

interface InputTagsProps {
    values: string[];
    setValues: (callback: (data: string[]) => string[]) => void;
    placeholder: string;
    validTags: string[];
    setValidTags: (callback: (data: string[]) => string[]) => void;
}

interface IWeblerBadgeProps {
    name: string,
    state: "neutral" | "cancellable" | "followable";
    className?: string;
    onClick?: () => void;
}


export const WeblerBadge = ({ name, state, className, onClick }: IWeblerBadgeProps) => {

    const callback = () => {
        if(typeof onClick == "function") onClick();
    }
    const _cls = 'bg-secondary-subtle text-secondary ' + className;
    return (
        <Badge className={_cls} style={{ cursor: "pointer" }}>
            {name}
            {
                state == "cancellable" ?
                    <button className="ms-2 text-danger fw-bold" onClick={callback} style={{ outline: "none", background: "none", border: "none" }}>&times;</button>
                : ""
            }
        </Badge>
    )
}


const InputTags = ({ values, setValues, placeholder, validTags, setValidTags }: InputTagsProps) => {

    const [input, setInput] = useState("");
    const [filtered, setFiltered] = useState<string[]>([]);

    const handleInputChange = (e: any) => {
        setInput(e.target.value.toLowerCase().trim());
        setFiltered(validTags.filter(i => i.startsWith(input)).splice(0, 3));
    }

    // add tag to list
    const appendTag = (tagName: string) => {
        setValues(values=> values.includes(tagName) ? [...values]: [...values, tagName]);
        setInput("");
    }

    const handleSubmit = () => {
        if (input.length === 0 || values.length >= 10 || !validTags.includes(input)) {
            setInput("");
            return
        }
        appendTag(input);
    }

    let content = values.map(tagName => {
        const handleRemove = () => {
            setValues(values => values.filter(val => val !== tagName))
        }

        return (
            <WeblerBadge name={tagName} state="cancellable" onClick={handleRemove} key={tagName} />
        )
    });

    const filteredContent = filtered.map(tagName => {
        return (
            <li key={"filtered-tag-"+tagName} style={{ cursor: "pointer" }} onClick={() => appendTag(tagName)}>
                {tagName}
            </li>
        )
    });

    return (
        <div className="d-flex flex-wrap gap-1">
            {content}
            <div className="d-flex gap-1">
                <FormControl
                    type="text"
                    size="sm"
                    style={{ width: "80px" }}
                    value={input} onChange={e => handleInputChange(e) }
                    placeholder={placeholder}
                />
                <Button size="sm" onClick={handleSubmit}>
                    <FaPlus />
                </Button>
            </div>
            {
                filtered.length > 0 && input.length > 0 ? 
                (<ul className="d-block bg-success-subtle"> {filteredContent} </ul>) 
                : ""
            }
        </div>
    )
}

export default InputTags