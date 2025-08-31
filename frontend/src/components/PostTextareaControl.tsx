import { forwardRef, useRef, useState, useLayoutEffect } from "react";
import { FormControl, Button } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";
import UserSearch from "./UserSearch";
import { UserMinimal } from "../features/profile/pages/Profile";

interface PostTextareaControlProps {
    value: string;
    setValue: (value: string) => void;
    placeholder?: string;
    rows?: number;
    size?: "sm" | "lg"; // bootstrap sizes
    required?: boolean;
    maxLength?: number;
}

// Forward ref so parent can still access textarea
const PostTextareaControl = forwardRef<HTMLTextAreaElement, PostTextareaControlProps>(
    ({ value, setValue, placeholder, rows = 3, size, required, maxLength }, ref) => {
        const innerRef = useRef<HTMLTextAreaElement>(null);
        const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? innerRef;
        const popupRef = useRef<HTMLDivElement>(null);

        const [showUserSearch, setShowUserSearch] = useState(false);
        const [searchValue, setSearchValue] = useState("");
        const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
        const [triggerIndex, setTriggerIndex] = useState<number | null>(null);

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const cursor = e.target.selectionStart;
            const newValue = e.target.value;
            setValue(newValue);

            const lastChar = newValue[cursor - 1];

            if (lastChar === "@") {
                setTriggerIndex(cursor - 1);
                setSearchValue("");
                updatePopupPosition();
                setShowUserSearch(true);
            }

            if (showUserSearch && triggerIndex !== null) {
                setShowUserSearch(false);
            }
        };

        const updatePopupPosition = () => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            const offset = 5;
            setPopupPos({ top: textarea.offsetHeight + offset, left: 10 });
        };

        useLayoutEffect(() => {
            if (!showUserSearch) return;

            const textarea = textareaRef.current;
            const popup = popupRef.current;
            if (!textarea || !popup) return;

            const rect = textarea.getBoundingClientRect();
            const popupHeight = popup.offsetHeight;
            const spaceAbove = rect.top;
            const offset = 5;

            let newTop: number;
            const newLeft = 10;

            if (spaceAbove >= popupHeight + offset) {
                newTop = -(popupHeight + offset);
            } else {
                newTop = textarea.offsetHeight + offset;
            }

            setPopupPos({ top: newTop, left: newLeft });
        }, [showUserSearch, searchValue]);

        const handleSelectUser = (user: UserMinimal) => {
            if (triggerIndex === null) return;

            const before = value.substring(0, triggerIndex);
            const after = value.substring((textareaRef.current?.selectionStart ?? 0));

            const replacement = `[user id="${user.id}"]${user.name}[/user] `;
            const newText = before + replacement + after;

            setValue(newText);
            setShowUserSearch(false);

            setTimeout(() => {
                if (textareaRef.current) {
                    const pos = before.length + replacement.length;
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = pos;
                    textareaRef.current.focus();
                }
            });
        };

        return (
            <div style={{ position: "relative" }}>
                <FormControl
                    ref={textareaRef}
                    as="textarea"
                    rows={rows}
                    placeholder={placeholder ?? "Write your comment here..."}
                    value={value}
                    onChange={handleChange}
                    size={size}
                    required={required}
                    maxLength={maxLength}
                />

                {showUserSearch && (
                    <div
                        ref={popupRef}
                        style={{
                            position: "absolute",
                            top: popupPos.top,
                            left: popupPos.left,
                            zIndex: 2000,
                            background: "white",
                            border: "1px solid #ccc",
                            borderRadius: "0.25rem",
                            padding: "0.25rem",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                            minWidth: "250px",
                        }}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted">Mention user</small>
                            <Button
                                size="sm"
                                variant="light"
                                onClick={() => setShowUserSearch(false)}
                                style={{ lineHeight: "1", padding: "0.1rem 0.25rem" }}
                            >
                                <FaTimes />
                            </Button>
                        </div>
                        <UserSearch
                            value={searchValue}
                            setValue={setSearchValue}
                            onSelect={handleSelectUser}
                            placeholder="Search users..."
                            maxWidthPx={250}
                        />
                    </div>
                )}
            </div>
        );
    }
);

PostTextareaControl.displayName = "PostTextareaControl";
export default PostTextareaControl;