import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
    const { pathname, search } = useLocation();

    useEffect(() => {
        scrollTo({ top: 0, behavior: "instant" });
    }, [pathname, search]);

    return null;
}

export default ScrollToTop;