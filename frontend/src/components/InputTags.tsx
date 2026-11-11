import { Badge, Button, cssVars, cx, FormControl } from "./ui";
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useApi } from '../context/apiCommunication';
import { TagListData } from '../features/tags/types';
import "./InputTags.css";
import "./Suggestions.css";

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
    return (
        <Badge className={cx("wb-tags-badge bg-secondary-subtle text-secondary d-inline-flex align-items-center gap-1", className)}>
            <span>{name}</span>
            {
                state === "cancellable" &&
                <button
                    type="button"
                    className="wb-tags-badge-remove d-flex align-items-center justify-content-center text-danger fw-bold"
                    onClick={callback}
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
    size?: "sm" | "lg";
    id?: string;
}

export const TagSearch = ({
    query,
    placeholder = "Search...",
    maxWidthPx = 360,
    handleSearch,
    size,
    id
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
        const result = await sendJsonRequest<TagListData>(`/Discussion/GetTagList`, "POST");
        if (result.data) {
            setValidTags(result.data.tags);
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
            <div className="position-relative w-100">
                <FormControl
                    id={id}
                    ref={inputRef}
                    type="search"
                    size={size}
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-100"
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
                        ref={cssVars({ "--wb-suggestions-max-width": maxWidthPx })}
                        className="wb-suggestions-list wb-suggestions-list--capped-width position-absolute list-unstyled m-0 p-1"
                        role="listbox"
                    >
                        {filtered.map((tag) => (
                            <li
                                key={`filtered-tag-${tag}`}
                                onClick={() => handleSelectTag(tag)}
                                onMouseDown={(e) => e.preventDefault()}
                                className="wb-suggestions-item"
                                role="option"
                                aria-selected={false}
                            >
                                {tag}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <Button size={size} onClick={() => handleSearch(input)}>Search</Button>
        </div>
    );
};

interface InputTagsProps {
    values: string[];
    setValues: (callback: (data: string[]) => string[]) => void;
    placeholder: string;
    id?: string;
}

const InputTags = ({ values, setValues, placeholder, id }: InputTagsProps) => {
    const [input, setInput] = useState("");
    const [filtered, setFiltered] = useState<string[]>([]);
    const [validTags, setValidTags] = useState<string[]>([]);
    const { sendJsonRequest } = useApi();

    useEffect(() => {
        getValidTags();
    }, []);

    const getValidTags = async () => {
        const result = await sendJsonRequest<TagListData>(`/Discussion/GetTagList`, "POST");
        if (result.data) {
            setValidTags(result.data.tags);
        }
    }

    const handleInputChange = (e: ChangeEvent<{ value: string }>) => {
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
        <div className="wb-tags-input-container d-flex flex-wrap align-items-center position-relative">
            {content}

            {values.length < 10 && (
                <div className="d-flex position-relative">
                    <FormControl
                        id={id}
                        type="text"
                        size="sm"
                        className={cx("wb-tags-input-field", values.length > 0 && "ms-1")}
                        value={input}
                        onChange={e => handleInputChange(e)}
                        placeholder={placeholder}
                    />
                    {filtered.length > 0 && input.length > 0 && (
                        <ul className="wb-suggestions-list wb-suggestions-list--fixed-width position-absolute list-unstyled m-0 p-1">
                            {filtered.map(tagName => (
                                <li
                                    key={"filtered-tag-" + tagName}
                                    onClick={() => appendTag(tagName)}
                                    onMouseDown={e => e.preventDefault()}
                                    className="wb-suggestions-item"
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
