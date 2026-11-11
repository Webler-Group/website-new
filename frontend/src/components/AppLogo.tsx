import { cx } from "./ui";

/** Webler logo; the white variant is shown in dark theme (see .wb-app-logo in styles/theme.css). */
const AppLogo = ({ className }: { className?: string }) => (
    <span className={cx("wb-app-logo", className)}>
        <img className="wb-app-logo-image wb-app-logo-image--light" src="/resources/images/logo.svg" alt="Webler logo" height="32" width="96" />
        <img className="wb-app-logo-image wb-app-logo-image--dark" src="/resources/images/logotransparent.svg" alt="" aria-hidden="true" height="32" width="96" />
    </span>
);

export default AppLogo;
