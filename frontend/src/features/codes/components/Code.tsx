import { cx } from "../../../components/ui";
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { languagesInfo } from '../../../data/compilerLanguages';
import { useNavigate } from 'react-router-dom';
import "./Code.css";
import { CodeMinimal } from '../types';
import { isUser, UserMinimal } from '../../profile/types';
import React from 'react';
import { FaThumbsUp } from 'react-icons/fa';
import { FaComment, FaLock } from 'react-icons/fa6';


interface CodeProps {
    code: CodeMinimal<UserMinimal | string>;
    searchQuery: string;
    onClick?: () => void;
    selected?: boolean;
    variant?: "default" | "compact";
}

const Code = React.forwardRef(({ code, onClick, selected, variant = "default" }: CodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const isCompact = variant === "compact";
    const navigate = useNavigate();

    let title = code.name;

    const activate = () => {
        if (onClick) {
            onClick();
        } else {
            navigate("/Compiler-Playground/" + code.id);
        }
    }

    const handleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("a")) {
            return;
        }
        activate();
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
        }
    }

    return <div ref={ref ?? undefined} className="wb-util-min-w-0 overflow-hidden">
        <div className={cx("wb-codes-item border-bottom bg-body d-flex align-items-start p-2", isCompact && "wb-codes-item--compact", selected && "wb-codes-item--selected")}
            // Interactive role + focusable: real semantics, and stops mobile Chrome's "Touch to Search"
            // from treating a tap as a tap on plain text (a real <a> can't be used: it contains a profile link)
            role={onClick ? "button" : "link"}
            tabIndex={0}
            aria-pressed={onClick ? !!selected : undefined}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            {/* Left: title + language + stats */}
            <div className="flex-grow-1 wb-util-min-w-0">
                <h3 className="wb-codes-item-title text-truncate text-body-emphasis">{title}</h3>

                <div className={`d-flex align-items-center gap-2 small text-secondary ${isCompact ? "mt-1" : "mt-2"}`}>
                    <span className={`wb-codes-language-chip wb-language-${code.language}`}>
                        {languagesInfo[code.language]?.displayName || code.language}
                    </span>
                    <div className="d-flex align-items-center gap-1 opacity-75">
                        <FaThumbsUp size={isCompact ? 10 : 11} />
                        <span>{code.votes}</span>
                    </div>
                    <div className="d-flex align-items-center gap-1 opacity-75">
                        <FaComment size={isCompact ? 10 : 11} />
                        <span>{code.comments}</span>
                    </div>
                    {code.isPublic === false && <FaLock size={11} className="text-warning" />}
                </div>
            </div>

            {/* Right: date + name + avatar */}
            {isUser(code.user) && (
                <div className="flex-shrink-0 ms-2 d-flex flex-column align-items-end justify-content-between wb-codes-item-user-meta">
                    <small className="text-muted wb-codes-item-timestamp">{DateUtils.format(new Date(code.updatedAt))}</small>
                    {!isCompact && (
                        <div className="d-flex align-items-center gap-1 mt-1">
                            <ProfileName userId={code.user.id} userName={code.user.name} />
                            <ProfileAvatar size={28} avatarUrl={code.user.avatarUrl} />
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>;
});

export default Code;
