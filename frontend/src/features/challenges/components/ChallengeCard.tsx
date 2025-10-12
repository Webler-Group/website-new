import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IChallenge } from "../types";
import LanguageIcons from "./LanguageIcons";

interface ChallengeCardProps {
  challenge: IChallenge;
  i: number;
}

const ChallengeCard = ({ challenge, i }: ChallengeCardProps) => {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);

  const difficultyColor: Record<string, string> = {
    easy: "green",
    medium: "orange",
    hard: "red",
  };

  const hoverDifficultyColor: Record<string, string> = {
    easy: "darkgreen",
    medium: "darkorange",
    hard: "darkred",
  };

  const bgColor = i % 2 === 0 ? "#ffffff" : "#dde3e8ff";

  return (
    <div
      onClick={() => navigate(`/Challenge/${challenge.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        backgroundColor: bgColor,
        borderRadius: "8px",
        padding: "0.5rem 1rem",
        marginBottom: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: "1rem",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            textDecoration: hover ? "underline" : "none",
            color: hover ? "#007bff" : "#000",
          }}
        >
          {challenge.title}
        </div>
        <div>
          <p
            style={{
              fontWeight: 700,
              color: hover
                ? hoverDifficultyColor[challenge.difficulty]
                : difficultyColor[challenge.difficulty],
              margin: 0,
            }}
          >
            {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
          </p>
        </div>
      </div>
    <LanguageIcons challenge={challenge} />
    </div>
  );
};

export default ChallengeCard;
