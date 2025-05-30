import "./ToggleSwitch.css";
import { ChangeEvent } from 'react'

interface ToggleSwitchProps extends React.LabelHTMLAttributes<any> {
    value: boolean;
    onChange: (e: ChangeEvent) => void;
}

export const ToggleSwitch = ({ value, onChange, ...props }: ToggleSwitchProps) => {

    return (
        <span {...props}>
            <label className="toggle-switch">
                <input className="toggle-switch__input" type="checkbox" checked={value} onChange={onChange} />
                <span className="toggle-switch__span" />
            </label>
        </span>
    )
}

export default ToggleSwitch;