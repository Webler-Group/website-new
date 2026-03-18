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
}

const Code = React.forwardRef(({ code, onClick, selected }: CodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
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
        <div className={"wb-codes-item border-bottom p-3 d-flex align-items-center gap-3" + (selected ? " selected" : "")} onClick={handleClick}>
            {/* Left Side: Avatar */}
            {isUser(code.user) && (
                <div className="flex-shrink-0">
                    <ProfileAvatar size={44} avatarUrl={code.user.avatarUrl} />
                </div>
            )}

            {/* Content Area */}
            <div className="flex-grow-1 min-width-0 d-flex flex-column gap-1">
                {/* Row 1: Title & Timestamp */}
                <div className="d-flex justify-content-between align-items-center">
                    <b className="text-dark text-truncate" style={{ fontSize: "1.05rem" }}>{title}</b>
                    <div className="text-muted ms-2 flex-shrink-0" style={{ fontSize: "0.75rem" }}>
                        {DateUtils.format(new Date(code.updatedAt || code.createdAt!))}
                    </div>
                </div>

                {/* Row 2: User Name */}
                {isUser(code.user) && (
                    <div className="d-flex align-items-center mt-n1">
                        <ProfileName userId={code.user.id} userName={code.user.name} />
                    </div>
                )}
                
                {/* Row 3: Language Chip & Stats */}
                <div className="d-flex small align-items-center flex-wrap gap-3 text-secondary pt-1">
                    <span className="wb-language-chip" style={{ backgroundColor: languagesInfo[code.language]?.color || "#6c757d" }}>
                        {languagesInfo[code.language]?.displayName || code.language}
                    </span>
                    
                    <div className="d-flex align-items-center gap-1">
                        <FaThumbsUp size={12} className="opacity-75" />
                        <span style={{ fontWeight: 500 }}>{code.votes}</span>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                        <FaComment size={12} className="opacity-75" />
                        <span style={{ fontWeight: 500 }}>{code.comments}</span>
                    </div>
                    
                    {code.isPublic === false && <FaLock size={12} className="text-warning" />}
                </div>
            </div>
        </div>
    );

    return ref ? <div ref={ref}>{body}</div> : <div>{body}</div>;
});

export default Code;