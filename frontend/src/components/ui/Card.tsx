import { HTMLAttributes } from "react";
import { cx, Variant } from "./utils";

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, "style">;

interface CardProps extends DivProps {
    bg?: Exclude<Variant, "link">;
    text?: Exclude<Variant, "link">;
    border?: Exclude<Variant, "link">;
}

function Card({ bg, text, border, className, ...props }: CardProps) {
    return <div className={cx("card", bg && `bg-${bg}`, text && `text-${text}`, border && `border-${border}`, className)} {...props} />;
}

function CardBody({ className, ...props }: DivProps) {
    return <div className={cx("card-body", className)} {...props} />;
}

function CardHeader({ className, ...props }: DivProps) {
    return <div className={cx("card-header", className)} {...props} />;
}

function CardFooter({ className, ...props }: DivProps) {
    return <div className={cx("card-footer", className)} {...props} />;
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <div className={cx("card-title h5", className)} {...props} />;
}

function CardSubtitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <div className={cx("card-subtitle h6", className)} {...props} />;
}

function CardText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cx("card-text", className)} {...props} />;
}

Card.Body = CardBody;
Card.Header = CardHeader;
Card.Footer = CardFooter;
Card.Title = CardTitle;
Card.Subtitle = CardSubtitle;
Card.Text = CardText;

export default Card;
