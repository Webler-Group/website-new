import { cssVars, cx, Variant } from "./utils";

interface ProgressBarProps {
    now: number;
    min?: number;
    max?: number;
    variant?: Exclude<Variant, "link">;
    label?: string;
    className?: string;
}

function ProgressBar({ now, min = 0, max = 100, variant, label, className }: ProgressBarProps) {
    const percentage = max > min ? ((now - min) / (max - min)) * 100 : 0;
    return (
        <div
            className={cx("progress", className)}
            role="progressbar"
            aria-valuenow={now}
            aria-valuemin={min}
            aria-valuemax={max}
        >
            <div
                ref={cssVars({ "--wb-ui-progress-value": `${Math.min(100, Math.max(0, percentage))}%` })}
                className={cx("progress-bar wb-ui-progress-bar", variant && `bg-${variant}`)}
            >
                {label}
            </div>
        </div>
    );
}

export default ProgressBar;
