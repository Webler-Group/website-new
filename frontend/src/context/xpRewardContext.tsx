import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import XpRewardTypeEnum from "../data/XpRewardTypeEnum";
import { useAuth } from "../features/auth/context/authContext";
import XpRewardAlert from "../components/XpRewardAlert";

/** XP award as returned by the backend (e.g. GetChallengeJob -> job.xpAwarded) */
export interface XpAward {
    total: number;
    rewards: { type: XpRewardTypeEnum; amount: number }[];
    /** User's XP total and level after the award */
    xp?: number;
    level?: number;
}

export interface XpRewardAlertItem {
    id: number;
    award: XpAward;
    /** New level when the award made the user level up */
    levelUp: number | null;
}

interface XpRewardContextType {
    /** Shows the XP reward alert and updates the logged in user's XP / level */
    showXpReward: (award: XpAward | null | undefined) => void;
}

const XpRewardContext = createContext<XpRewardContextType>({ showXpReward: () => {} });

export const useXpReward = () => useContext(XpRewardContext);

/** Maximum alerts visible at once, older ones are dropped */
const MAX_ALERTS = 3;

const XpRewardProvider = ({ children }: { children: ReactNode }) => {
    const { userInfo, updateUser } = useAuth();
    const [alerts, setAlerts] = useState<XpRewardAlertItem[]>([]);
    const nextIdRef = useRef(1);

    // Latest user info without recreating showXpReward on every change
    const userInfoRef = useRef(userInfo);
    userInfoRef.current = userInfo;

    const showXpReward = useCallback((award: XpAward | null | undefined) => {
        if (!award || award.total <= 0) return;

        const user = userInfoRef.current;
        const levelUp = user && award.level !== undefined && award.level > user.level ? award.level : null;
        if (user) {
            updateUser({
                ...user,
                xp: award.xp ?? user.xp + award.total,
                level: award.level ?? user.level
            });
        }

        const item: XpRewardAlertItem = { id: nextIdRef.current++, award, levelUp };
        setAlerts(prev => [...prev, item].slice(-MAX_ALERTS));
    }, [updateUser]);

    const dismiss = useCallback((id: number) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    return (
        <XpRewardContext.Provider value={{ showXpReward }}>
            {children}
            <div className="wb-xp-reward-stack" aria-live="polite">
                {alerts.map(alert => (
                    <XpRewardAlert key={alert.id} item={alert} onClose={dismiss} />
                ))}
            </div>
        </XpRewardContext.Provider>
    );
};

export default XpRewardProvider;
