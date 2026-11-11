import "./ToggleSwitch.css";
import { ChangeEvent } from 'react'

interface ToggleSwitchProps extends React.LabelHTMLAttributes<any> {
    value: boolean;
    disabled?: boolean;
    onChange: (e: ChangeEvent) => void;
}

export const ToggleSwitch = ({ value, onChange, disabled, ...props }: ToggleSwitchProps) => {

    return (
        <span {...props}>
            <label className="wb-toggle-switch">
                <input className="wb-toggle-switch-input" type="checkbox" checked={value} onChange={onChange} disabled={disabled} />
                <span className="wb-toggle-switch-slider" />
            </label>
        </span>
    )
}

export default ToggleSwitch;