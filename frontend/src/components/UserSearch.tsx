import { cssVars, cx, Form, ListGroup } from "./ui";
import { useState, useEffect, useRef } from "react";
import { useApi } from "../context/apiCommunication";
import ProfileAvatar from "./ProfileAvatar";
import { SearchProfilesData, UserMinimal } from "../features/profile/types";
import "./Suggestions.css";
import "./UserSearch.css";

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
        if (!value) return;

        const delayDebounce = setTimeout(async () => {
            const result = await sendJsonRequest<SearchProfilesData>(
                "/Profile/Search",
                "POST",
                { searchQuery: value }
            );
            if (result.data) {
                setResults(result.data.users);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [value]);

    const handleSelect = (user: UserMinimal) => {
        onSelect(user);
        if (inputRef.current) inputRef.current.blur();
    };

    return (
        <div
            ref={cssVars({ "--wb-user-search-max-width": maxWidthPx })}
            className={cx("position-relative w-100", maxWidthPx && "wb-user-search--capped-width")}
        >
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

            {isFocused && value && (
                <ListGroup className="wb-suggestions-list position-absolute w-100">
                    {results.map((user) => (
                        <ListGroup.Item
                            key={user.id}
                            action
                            onClick={() => handleSelect(user)}
                            onMouseDown={(e) => e.preventDefault()}
                            className="d-flex align-items-start gap-2"
                        >
                            <ProfileAvatar avatarUrl={user.avatarUrl} size={32} />
                            <span>{user.name}</span>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}

            {isFocused && value && results.length === 0 && (
                <div className="wb-suggestions-list position-absolute w-100 text-muted small p-2">
                    No users found
                </div>
            )}
        </div>
    );
};

export default UserSearch;
