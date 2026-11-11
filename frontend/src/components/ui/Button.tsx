import { ComponentProps, Ref } from "react";
import { Link } from "react-router-dom";
import { ButtonVariant, cx, Size } from "./utils";

interface BaseButtonProps {
    variant?: ButtonVariant;
    size?: Size;
    active?: boolean;
}

type ButtonAsButtonProps = BaseButtonProps & Omit<ComponentProps<"button">, "style"> & {
    to?: undefined;
    ref?: Ref<HTMLButtonElement>;
};

type ButtonAsLinkProps = BaseButtonProps & Omit<ComponentProps<typeof Link>, "style"> & {
    /** Renders the button as a router link */
    to: string;
    disabled?: boolean;
};

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export function buttonClasses({ variant = "primary", size, active, disabled }: BaseButtonProps & { disabled?: boolean }) {
    const variantClass = variant === "subtle" ? "wb-ui-button--subtle" : `btn-${variant}`;
    return cx("btn", variantClass, size && `btn-${size}`, active && "active", disabled && "disabled");
}

function Button(props: ButtonProps) {
    if (props.to !== undefined) {
        const { variant, size, active, disabled, className, ...linkProps } = props;
        return (
            <Link
                className={cx(buttonClasses({ variant, size, active, disabled }), className)}
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : undefined}
                {...linkProps}
            />
        );
    }

    const { variant, size, active, className, type = "button", ...buttonProps } = props;
    return (
        <button
            type={type}
            className={cx(buttonClasses({ variant, size, active }), className)}
            {...buttonProps}
        />
    );
}

export default Button;
