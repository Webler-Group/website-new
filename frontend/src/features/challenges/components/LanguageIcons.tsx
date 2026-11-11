import { FaCheckCircle } from "react-icons/fa";
import { languagesInfo } from "../../../data/compilerLanguages";
import { ChallengeMinimal } from "../types";
import "./LanguageIcons.css";

interface LanguageIconsProps {
    challenge: ChallengeMinimal;
}

const LanguageIcons = ({ challenge }: LanguageIconsProps) => {
    return (
        <div className="d-flex flex-wrap gap-2">
            {Object.entries(languagesInfo).filter(([key]) => key !== "web").map(([key, info]) => (
                <div
                    key={key}
                    className={`wb-challenges-language-icon wb-language-${key} position-relative`}
                    title={info.displayName}
                >
                    {info.shortName}
                    {challenge.submissions?.some(sub => sub.language === key && sub.passed) && (
                        <div
                            className="wb-challenges-language-icon-solved position-absolute bottom-0 end-0 text-success bg-white rounded-circle d-flex">
                            <FaCheckCircle />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

export default LanguageIcons;