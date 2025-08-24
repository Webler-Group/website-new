import { useEffect, useRef, useState } from 'react';
import { Badge, Button, FormControl } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { useApi } from '../context/apiCommunication';

interface WeblerBadgeProps {
    name: string,
    state: "neutral" | "cancellable" | "followable";
    className?: string;
    onClick?: () => void;
}

export const WeblerBadge = ({ name, state, className, onClick }: WeblerBadgeProps) => {
    const callback = () => {
        if (typeof onClick == "function") onClick();
    };
    const _cls = 'bg-secondary-subtle text-secondary d-inline-flex align-items-center gap-1 ' + (className ?? "");
    return (
        <Badge className={_cls} style={{ cursor: "default", padding: "0.4rem 0.6rem" }}>
            <span>{name}</span>
            {
                state === "cancellable" &&
                <button
                    className="d-flex align-items-center justify-content-center text-danger fw-bold"
                    onClick={callback}
                    style={{
                        outline: "none",
                        background: "none",
                        border: "none",
                        fontSize: "1.1rem",
                        lineHeight: 1,
                        cursor: "pointer"
                    }}
                >
                    <FaTimes />
                </button>

            }
        </Badge>
    );
};

interface TagSearchProps {
    query: string;
    placeholder?: string;
    maxWidthPx?: number;
    handleSearch: (value: string) => void;
}

export const TagSearch = ({
    query,
    placeholder = "Search...",
    maxWidthPx = 360,
    handleSearch
}: TagSearchProps) => {
    const { sendJsonRequest } = useApi();
    const [validTags, setValidTags] = useState<string[]>([]);
    const [input, setInput] = useState(query);
    const [filtered, setFiltered] = useState<string[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getValidTags();
    }, []);

    useEffect(() => {
        setInput(query);
    }, [query]);

    useEffect(() => {
        setFiltered(filterBy(input, validTags));
    }, [input, validTags]);

    const getValidTags = async () => {
        const result = await sendJsonRequest(`/Tag`, "POST");
        if (result) {
            const resArr = result.map((t: any) => t.name);
            setValidTags(resArr);
        }
    };

    const filterBy = (val: string, pool: string[]) => {
        const trimmed = val.trim();
        if (trimmed.length === 0) {
            return pool.slice(0, 10);
        } else {
            return pool
                .filter((i) => i.toLowerCase().startsWith(trimmed.toLowerCase()) && i.toLowerCase() !== trimmed.toLowerCase())
                .slice(0, 10);
        }
    };

    const handleSelectTag = (tagName: string) => {
        setInput(tagName);
    }

    return (
        <div className='d-flex gap-2'>
            <div className="position-relative" style={{ width: "100%" }}>
                <FormControl
                    ref={inputRef}
                    type="search"
                    size="sm"
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{ width: "100%" }}
                    aria-autocomplete="list"
                    aria-expanded={filtered.length > 0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleSearch(input);
                            if(inputRef.current) {
                                inputRef.current.blur();
                            }
                        }
                    }}
                />
                {isFocused && filtered.length > 0 && (
                    <ul
                        className="position-absolute list-unstyled m-0 p-1"
                        style={{
                            top: "100%",
                            left: 0,
                            zIndex: 1000,
                            background: "white",
                            border: "1px solid #ccc",
                            borderRadius: "0.25rem",
                            maxHeight: "150px",
                            overflowY: "auto",
                            width: `min(100%, ${maxWidthPx}px)`,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}
                        role="listbox"
                    >
                        {filtered.map((tag) => (
                            <li
                                key={`filtered-tag-${tag}`}
                                style={{ cursor: "pointer", padding: "0.25rem 0.5rem", borderRadius: "0.25rem" }}
                                onClick={() => handleSelectTag(tag)}
                                onMouseDown={(e) => e.preventDefault()}
                                className="hover-bg-light"
                                role="option"
                                aria-selected={false}
                            >
                                {tag}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <Button size="sm" onClick={() => handleSearch(input)}>Search</Button>
        </div>
    );
};

interface InputTagsProps {
    values: string[];
    setValues: (callback: (data: string[]) => string[]) => void;
    placeholder: string;
}

const InputTags = ({ values, setValues, placeholder }: InputTagsProps) => {
    const [input, setInput] = useState("");
    const [filtered, setFiltered] = useState<string[]>([]);
    const [validTags, setValidTags] = useState<string[]>([]);
    const { sendJsonRequest } = useApi();

    useEffect(() => {
        getValidTags();
    }, []);

    const getValidTags = async () => {
        const result = await sendJsonRequest(`/Tag`, "POST");
        if (result) {
            const resArr = result.map((tag: any) => tag.name);
            setValidTags(resArr);
        }
    }

    const handleInputChange = (e: any) => {
        const val = e.target.value.toLowerCase().trim();
        setInput(val);

        if (val.length > 0) {
            setFiltered(
                validTags
                    .filter(i => i.startsWith(val) && !values.includes(i))
                    .slice(0, 10)
            );
        } else {
            setFiltered([]);
        }
    };

    const appendTag = (tagName: string) => {
        if (values.length >= 10) return;
        setValues(values => values.includes(tagName) ? [...values] : [...values, tagName]);
        setInput("");
        setFiltered([]);
    };

    let content = values.map(tagName => {
        const handleRemove = () => {
            setValues(values => values.filter(val => val !== tagName));
        };

        return (
            <WeblerBadge name={tagName} state="cancellable" onClick={handleRemove} key={tagName} />
        );
    });

    return (
        <div
            className="d-flex flex-wrap align-items-center position-relative"
            style={{ minWidth: "200px", gap: "0.25rem" }}
        >
            {content}

            {values.length < 10 && (
                <div className="d-flex position-relative">
                    <FormControl
                        type="text"
                        size="sm"
                        style={{ width: "120px", marginLeft: values.length > 0 ? "0.25rem" : "0" }}
                        value={input}
                        onChange={e => handleInputChange(e)}
                        placeholder={placeholder}
                    />
                    {filtered.length > 0 && input.length > 0 && (
                        <ul
                            className="position-absolute list-unstyled m-0 p-1"
                            style={{
                                top: "100%",
                                left: 0,
                                zIndex: 1000,
                                background: "white",
                                border: "1px solid #ccc",
                                borderRadius: "0.25rem",
                                maxHeight: "150px",
                                overflowY: "auto",
                                width: "150px",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                            }}
                        >
                            {filtered.map(tagName => (
                                <li
                                    key={"filtered-tag-" + tagName}
                                    style={{
                                        cursor: "pointer",
                                        padding: "0.25rem 0.5rem",
                                        borderRadius: "0.25rem"
                                    }}
                                    onClick={() => appendTag(tagName)}
                                    onMouseDown={e => e.preventDefault()}
                                    className="hover-bg-light"
                                >
                                    {tagName}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default InputTags;
