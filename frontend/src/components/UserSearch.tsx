import { useState, useEffect, useRef } from "react";
import { useApi } from "../context/apiCommunication";
import { UserMinimal } from "../features/profile/pages/Profile";
import ProfileAvatar from "./ProfileAvatar";
import { Form, ListGroup } from "react-bootstrap";

interface UserSearchProps {
    value: string;
    setValue: (value: string) => void;
    onSelect: (user: UserMinimal) => void;
    placeholder?: string;
    maxWidthPx?: number;
}

const UserSearch = ({ value, setValue, onSelect, placeholder, maxWidthPx }: UserSearchProps) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<UserMinimal[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {

        const delayDebounce = setTimeout(async () => {
            try {
                const res = await sendJsonRequest(
                    "/Profile/Search",
                    "POST",
                    { searchQuery: value }
                );
                setResults(res.users ?? []);
            } catch (err) {
                console.error(err);
                setResults([]);
            }
        }, 300); // debounce

        return () => clearTimeout(delayDebounce);
    }, [value]);

    const handleSelect = (user: UserMinimal) => {
        onSelect(user);
        if (inputRef.current) inputRef.current.blur();
    };

    const wrapperStyle = maxWidthPx
        ? { width: "100%", maxWidth: `${maxWidthPx}px` }
        : { width: "100%" };

    return (
        <div className="position-relative" style={wrapperStyle}>
            <Form.Control
                autoComplete="off"
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder ?? "Search users..."}
                size="sm"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 100)}
            />

            {isFocused && (
                <ListGroup
                    className="position-absolute"
                    style={{
                        top: "100%",
                        left: 0,
                        zIndex: 1000,
                        background: "white",
                        border: "1px solid #ccc",
                        borderRadius: "0.25rem",
                        maxHeight: "150px",
                        overflowY: "auto",
                        width: "100%",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    }}
                >
                    {results.map((user) => (
                        <ListGroup.Item
                            key={user.id}
                            action
                            onClick={() => handleSelect(user)}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{ cursor: "pointer" }}
                            className="d-flex align-items-start gap-2"
                        >
                            <ProfileAvatar avatarImage={user.avatar} size={32} />
                            <span>{user.name}</span>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}

            {isFocused && value && results.length === 0 && (
                <div
                    className="position-absolute text-muted small p-2"
                    style={{
                        top: "100%",
                        left: 0,
                        zIndex: 1000,
                        background: "white",
                        border: "1px solid #ccc",
                        borderRadius: "0.25rem",
                        width: "100%",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    }}
                >
                    No users found
                </div>
            )}
        </div>
    );
};

export default UserSearch;
