import { FaCheckCircle } from "react-icons/fa";
import { languagesInfo } from "../../../data/compilerLanguages";
import { IChallenge } from "../types";

interface LanguageIconsProps {
    challenge: IChallenge;
}

const LanguageIcons = ({ challenge }: LanguageIconsProps) => {
    return (
        <div className="d-flex flex-wrap gap-2">
            {Object.entries(languagesInfo).filter(([key]) => key != "web").map(([key, info]) => (
                <div
                    key={key}
                    className="d-flex justify-content-center align-items-center rounded-circle text-light position-relative small"
                    style={{
                        backgroundColor: info.color,
                        width: "32px",
                        height: "32px"
                    }}
                >
                    {info.shortName}
                    {challenge.submissions?.some(sub => sub.language === key && sub.passed) && (
                        <div
                            className="position-absolute bottom-0 end-0 text-success"
                            style={{ transform: "translate(25%, 25%)" }}>
                            <FaCheckCircle />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

export default LanguageIcons;