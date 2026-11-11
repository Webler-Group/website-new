import { ChangeEvent, createContext, ReactNode, useContext } from "react";
import { ButtonVariant, cx, Size } from "./utils";

interface ToggleButtonGroupContextValue {
    name?: string;
    type: "radio" | "checkbox";
    isChecked: (value: string) => boolean;
    toggle: (value: string) => void;
}

const ToggleButtonGroupContext = createContext<ToggleButtonGroupContextValue | null>(null);

interface ToggleButtonProps {
    id: string;
    value: string;
    type?: "radio" | "checkbox";
    name?: string;
    checked?: boolean;
    disabled?: boolean;
    variant?: ButtonVariant;
    size?: Size;
    className?: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    children?: ReactNode;
}

/** Checkbox / radio input rendered as a Bootstrap button (`btn-check` + label). */
export function ToggleButton({
    id,
    value,
    type,
    name,
    checked,
    disabled,
    variant = "primary",
    size,
    className,
    onChange,
    children
}: ToggleButtonProps) {
    const group = useContext(ToggleButtonGroupContext);

    const inputType = group?.type ?? type ?? "checkbox";
    const isChecked = group ? group.isChecked(value) : !!checked;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        group?.toggle(value);
        onChange?.(e);
    };

    return (
        <>
            <input
                id={id}
                className="btn-check"
                type={inputType}
                name={group?.name ?? name}
                value={value}
                checked={isChecked}
                disabled={disabled}
                autoComplete="off"
                onChange={handleChange}
            />
            <label htmlFor={id} className={cx("btn", `btn-${variant}`, size && `btn-${size}`, className)}>
                {children}
            </label>
        </>
    );
}

type ToggleButtonGroupProps<T extends string> = {
    name?: string;
    size?: Size;
    className?: string;
    children?: ReactNode;
} & (
    | { type: "radio"; value: T; onChange: (value: T) => void }
    | { type: "checkbox"; value: T[]; onChange: (value: T[]) => void }
);

export function ToggleButtonGroup<T extends string>(props: ToggleButtonGroupProps<T>) {
    const { name, size, className, children } = props;

    const isChecked = (value: string) =>
        props.type === "radio" ? props.value === value : props.value.includes(value as T);

    const toggle = (value: string) => {
        if (props.type === "radio") {
            props.onChange(value as T);
        } else {
            props.onChange(
                props.value.includes(value as T)
                    ? props.value.filter(v => v !== value)
                    : [...props.value, value as T]
            );
        }
    };

    return (
        <ToggleButtonGroupContext.Provider value={{ name, type: props.type, isChecked, toggle }}>
            <div role="group" className={cx("btn-group", size && `btn-group-${size}`, className)}>
                {children}
            </div>
        </ToggleButtonGroupContext.Provider>
    );
}

export default ToggleButton;
