import { useEffect } from "react";
import { FaStar } from "react-icons/fa6";
import { xpRewardTypeLabels } from "../data/XpRewardTypeEnum";
import type { XpRewardAlertItem } from "../context/xpRewardContext";

interface XpRewardAlertProps {
    item: XpRewardAlertItem;
    onClose: (id: number) => void;
    duration?: number;
}

/** Celebrates gained XP: total amount, breakdown of the rewards and a level up message */
const XpRewardAlert = ({ item, onClose, duration = 5000 }: XpRewardAlertProps) => {
    const { id, award, levelUp } = item;

    useEffect(() => {
        const timer = setTimeout(() => onClose(id), duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <div className="wb-xp-reward-alert shadow" role="status">
            <div className="wb-xp-reward-alert-icon">
                <FaStar />
            </div>
            <div className="wb-xp-reward-alert-body">
                <div className="wb-xp-reward-alert-total">+{award.total} XP</div>
                {award.rewards.length > 1 && (
                    <ul className="wb-xp-reward-alert-breakdown">
                        {award.rewards.map((reward, i) => (
                            <li key={i}>
                                <span>{xpRewardTypeLabels[reward.type] ?? "Reward"}</span>
                                <span>+{reward.amount}</span>
                            </li>
                        ))}
                    </ul>
                )}
                {award.rewards.length === 1 && (
                    <div className="wb-xp-reward-alert-reason">{xpRewardTypeLabels[award.rewards[0].type] ?? ""}</div>
                )}
                {levelUp !== null && (
                    <div className="wb-xp-reward-alert-level">Level up! You reached level {levelUp}</div>
                )}
            </div>
            <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={() => onClose(id)} />
        </div>
    );
};

export default XpRewardAlert;
