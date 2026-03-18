import { FaCheckCircle } from "react-icons/fa";
import { languagesInfo } from "../../../data/compilerLanguages";
import { ChallengeMinimal } from "../types";

interface LanguageIconsProps {
    challenge: ChallengeMinimal;
}

const LanguageIcons = ({ challenge }: LanguageIconsProps) => {
    return (
        <div className="d-flex flex-wrap gap-2">
            {Object.entries(languagesInfo).filter(([key]) => key !== "web").map(([key, info]) => (
                <div
                    key={key}
                    className="wb-challenge-lang-icon position-relative"
                    style={{ backgroundColor: info.color }}
                    title={info.displayName}
                >
                    {info.shortName}
                    {challenge.submissions?.some(sub => sub.language === key && sub.passed) && (
                        <div
                            className="position-absolute bottom-0 end-0 text-success bg-white rounded-circle d-flex"
                            style={{ transform: "translate(25%, 25%)", fontSize: "10px", padding: "1px" }}>
                            <FaCheckCircle />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

export default LanguageIcons;