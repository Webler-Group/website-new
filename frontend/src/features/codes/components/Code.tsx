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

    const handleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("a")) {
            return;
        }

        if(onClick) {
            onClick();
        } else {
            navigate("/Compiler-Playground/" + code.id);
        }
    }

    const body = (
        <div className={`wb-codes-item border-bottom d-flex align-items-center gap-3 ${isCompact ? "p-2 compact" : "py-2 px-3"} ${selected ? "selected" : ""}`} onClick={handleClick}>
            {/* Left Side: Avatar */}
            {isUser(code.user) && (
                <div className="flex-shrink-0">
                    <ProfileAvatar size={isCompact ? 32 : 38} avatarUrl={code.user.avatarUrl} />
                </div>
            )}

            {/* Content Area */}
            <div className="flex-grow-1 min-width-0 d-flex flex-column gap-1">
                {/* Row 1: Title */}
                <b className="text-dark text-truncate d-block" style={{ fontSize: isCompact ? "0.92rem" : "1rem" }}>{title}</b>

                {/* Row 2: Username · Language · Stats · Timestamp */}
                <div className="d-flex align-items-center justify-content-between gap-2 wb-code-meta overflow-hidden">
                    <div className="d-flex align-items-center flex-wrap gap-2 min-width-0 overflow-hidden">
                        {isUser(code.user) && !isCompact && (
                            <ProfileName userId={code.user.id} userName={code.user.name} />
                        )}
                        <span className="wb-language-chip" style={{ backgroundColor: languagesInfo[code.language]?.color || "#6c757d" }}>
                            {languagesInfo[code.language]?.displayName || code.language}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                            <FaThumbsUp size={11} />
                            <span>{code.votes}</span>
                        </span>
                        <span className="d-flex align-items-center gap-1">
                            <FaComment size={11} />
                            <span>{code.comments}</span>
                        </span>
                        {code.isPublic === false && <FaLock size={11} className="text-warning" />}
                    </div>
                    <span className="text-muted flex-shrink-0 wb-code-timestamp">
                        {DateUtils.format(new Date(code.updatedAt || code.createdAt!))}
                    </span>
                </div>
            </div>
        </div>
    );

    return ref ? <div ref={ref} className="min-width-0 overflow-hidden">{body}</div> : <div className="min-width-0 overflow-hidden">{body}</div>;
});

export default Code;