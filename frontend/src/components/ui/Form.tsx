import {
    ComponentProps,
    createContext,
    FormHTMLAttributes,
    HTMLAttributes,
    LabelHTMLAttributes,
    ReactNode,
    useContext
} from "react";
import { cx, Size } from "./utils";

const FormGroupContext = createContext<{ controlId?: string }>({});

export function Form({ className, ...props }: Omit<FormHTMLAttributes<HTMLFormElement>, "style"> & { ref?: React.Ref<HTMLFormElement> }) {
    return <form className={className} {...props} />;
}

interface FormGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    /** Links the group's label (`htmlFor`) and control (`id`) */
    controlId?: string;
}

export function FormGroup({ controlId, className, ...props }: FormGroupProps) {
    return (
        <FormGroupContext.Provider value={{ controlId }}>
            <div className={className} {...props} />
        </FormGroupContext.Provider>
    );
}

interface FormLabelProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, "style"> {
    visuallyHidden?: boolean;
}

export function FormLabel({ visuallyHidden, htmlFor, className, ...props }: FormLabelProps) {
    const { controlId } = useContext(FormGroupContext);
    return (
        <label
            htmlFor={htmlFor ?? controlId}
            className={cx("form-label", visuallyHidden && "visually-hidden", className)}
            {...props}
        />
    );
}

type FormControlProps =
    | ({ as?: "input"; size?: Size; isInvalid?: boolean; plaintext?: boolean } & Omit<ComponentProps<"input">, "size" | "style">)
    | ({ as: "textarea"; size?: Size; isInvalid?: boolean; plaintext?: boolean } & Omit<ComponentProps<"textarea">, "style">);

export function FormControl({ as, size, isInvalid, plaintext, className, id, ...props }: FormControlProps) {
    const { controlId } = useContext(FormGroupContext);
    const classes = cx(
        plaintext ? "form-control-plaintext" : "form-control",
        size && `form-control-${size}`,
        isInvalid && "is-invalid",
        className
    );
    if (as === "textarea") {
        return <textarea id={id ?? controlId} className={classes} {...(props as ComponentProps<"textarea">)} />;
    }
    return <input id={id ?? controlId} className={classes} {...(props as ComponentProps<"input">)} />;
}

interface FormSelectProps extends Omit<ComponentProps<"select">, "size" | "style"> {
    size?: Size;
    isInvalid?: boolean;
}

export function FormSelect({ size, isInvalid, className, id, ...props }: FormSelectProps) {
    const { controlId } = useContext(FormGroupContext);
    return (
        <select
            id={id ?? controlId}
            className={cx("form-select", size && `form-select-${size}`, isInvalid && "is-invalid", className)}
            {...props}
        />
    );
}

interface FormCheckProps extends Omit<ComponentProps<"input">, "type" | "style"> {
    type?: "checkbox" | "radio" | "switch";
    label?: ReactNode;
    inline?: boolean;
}

export function FormCheck({ type = "checkbox", label, inline, className, id, ...props }: FormCheckProps) {
    const { controlId } = useContext(FormGroupContext);
    const inputId = id ?? controlId;
    return (
        <div className={cx("form-check", type === "switch" && "form-switch", inline && "form-check-inline", className)}>
            <input
                id={inputId}
                type={type === "switch" ? "checkbox" : type}
                role={type === "switch" ? "switch" : undefined}
                className="form-check-input"
                {...props}
            />
            {label !== undefined && <label htmlFor={inputId} className="form-check-label">{label}</label>}
        </div>
    );
}

interface FormTextProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
    muted?: boolean;
}

export function FormText({ muted, className, ...props }: FormTextProps) {
    return <small className={cx("form-text", muted && "text-muted", className)} {...props} />;
}

Form.Group = FormGroup;
Form.Label = FormLabel;
Form.Control = FormControl;
Form.Select = FormSelect;
Form.Check = FormCheck;
Form.Text = FormText;

export default Form;
