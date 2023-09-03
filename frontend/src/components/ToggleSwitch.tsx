import "./ToggleSwitch.css";
import { ChangeEvent } from 'react'

interface ToggleSwitchProps {
    value: boolean;
    onChange: (e: ChangeEvent) => void;
}

export const ToggleSwitch = ({ value, onChange }: ToggleSwitchProps) => {

    return (
        <label className="toggle-switch">
            <input className="toggle-switch__input" type="checkbox" checked={value} onChange={onChange} />
            <span className="toggle-switch__span" />
        </label>
    )
}

export default ToggleSwitch