import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { languagesInfo, compilerLanguages } from "../../../data/compilerLanguages";

interface IChallenge {
  id: string | number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  submissions?: Array<{ language: string | compilerLanguages, passed: boolean }>;
}

interface LanguageIconsProps {
  challenge: IChallenge;
}

const CheckCircle2 = ({
  size = 18,
  className = "",
  strokeWidth = 2,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const LanguageIcons = ({ challenge }: LanguageIconsProps) => {
  return (
    <div className="d-flex flex-wrap gap-2 mt-1">
      {Object.entries(languagesInfo)
        .filter(([key]) => key !== "web") 
        .map(([key, info]) => {
          const isPassed = challenge.submissions?.some(
            (sub) => sub.language === key && sub.passed
          );

          return (
            <OverlayTrigger
              key={key}
              placement="top"
              overlay={<Tooltip id={`tooltip-${key}`}>{info.displayName}</Tooltip>}
            >
              <div
                className="position-relative rounded-circle d-flex align-items-center justify-content-center border bg-white shadow-sm"
                style={{
                  width: "36px",
                  height: "36px",
                  borderColor: isPassed ? "#28a745" : "#dee2e6",
                  opacity: isPassed ? 0.95 : 0.7,
                  transform: isPassed ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.25s ease-in-out",
                  cursor: "default",
                }}
              >
                <img
                  src={info.logo}
                  alt={info.displayName}
                  style={{
                    width: "65%",
                    height: "65%",
                    objectFit: "contain",
                    filter: isPassed ? "none" : "grayscale(30%)",
                  }}
                />
                {isPassed && (
                  <div
                    className="position-absolute d-flex align-items-center justify-content-center rounded-circle bg-success text-white shadow-sm"
                    style={{
                      width: "16px",
                      height: "16px",
                      top: "-4px",
                      right: "-4px",
                    }}
                  >
                    <CheckCircle2 size={10} strokeWidth={3} />
                  </div>
                )}
              </div>
            </OverlayTrigger>
          );
        })}
    </div>
  );
};

export default LanguageIcons;
