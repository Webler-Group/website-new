import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { FaCheck, FaThumbsUp } from "react-icons/fa";
import React, { MouseEvent } from 'react';
import { FaComment, FaLock } from 'react-icons/fa6';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { compilerLanguages, languagesInfo } from '../../../data/compilerLanguages';
import { useNavigate } from 'react-router-dom';
import "./Code.css";
import { IChallengeSubmission } from '../../challenges/types';

interface ICode {
  id?: string;
  name?: string;
  challengeId?: string;
  language: compilerLanguages;
  userName?: string;
  userId?: string;
  userAvatar?: string;
  createdAt?: string;
  updatedAt?: string;
  comments: number;
  votes: number;
  isUpvoted: boolean;
  isPublic: boolean;
  lastSubmission?: IChallengeSubmission;
  source?: string;
}

interface CodeProps {
  code: ICode;
  searchQuery: string;
  showUserProfile: boolean;
  onClick?: () => void;
  selected?: boolean;
}

const Code = React.forwardRef(({ code, showUserProfile, onClick, selected }: CodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
  const navigate = useNavigate();
  const handleClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    onClick ? onClick() : navigate("/Compiler-Playground/" + code.id);
  };

  const languageInfo = languagesInfo[code.language];
  const title = code.name;

  const body = (
    <div
      className={`wb-codes-item border-bottom p-2 d-md-flex${selected ? " selected" : ""}`}
      onClick={handleClick}
    >
      <div className="flex-grow-1 d-flex gap-2 align-items-center">
        <div
          className="language-logo-wrapper d-flex justify-content-center align-items-center"
          style={{
            width: "2rem",
            height: "2rem",
            minWidth: "2rem",
            minHeight: "2rem",
            overflow: "hidden",
          }}
        >
          {selected ? (
            <FaCheck size={20} color="dodgerblue" />
          ) : (
            <img
              src={languageInfo.logo}
              alt={languageInfo.displayName}
              className="language-logo"
            />
          )}
        </div>

        <div className="flex-grow-1">
          <div className="text-secondary">
            <b style={{ wordBreak: "break-word" }}>{title}</b>
          </div>

          <div className="d-flex small mt-2 align-items-center gap-3">
            <div className="d-flex align-items-center">
              <FaThumbsUp />
              <span className="ms-1">{code.votes}</span>
            </div>
            <div className="d-flex align-items-center">
              <FaComment />
              <span className="ms-1">{code.comments}</span>
            </div>
            {!showUserProfile && (
              <div>
                <span className="text-secondary">{DateUtils.format2(new Date(code.updatedAt!))}</span>
              </div>
            )}
            {!code.isPublic && (
              <div>
                <FaLock />
              </div>
            )}
          </div>
        </div>
      </div>

      {showUserProfile && (
        <div className="d-flex justify-content-end align-items-end mt-2">
          <div className="d-flex align-items-center">
            <div>
              <div>
                <small className="text-secondary">{DateUtils.format(new Date(code.createdAt!))}</small>
              </div>
              <div className="d-flex justify-content-end">
                <ProfileName userId={code.userId!} userName={code.userName!} />
              </div>
            </div>
            <div className="ms-2">
              <ProfileAvatar size={32} avatarImage={code.userAvatar!} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return ref ? <div ref={ref}>{body}</div> : <div>{body}</div>;
});

export type { ICode };
export default Code;
