import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface ScrollToTopProps {
    excludePaths: string[];
}

const ScrollToTop = ({ excludePaths }: ScrollToTopProps) => {
    const { pathname, search } = useLocation();

    useEffect(() => {
        const lowerPathname = pathname.toLowerCase();

        const isExcluded = excludePaths.some((path) =>
            lowerPathname.startsWith(path.toLowerCase())
        );

        if (!isExcluded) {
            scrollTo({ top: 0, behavior: "instant" });
        }
    }, [pathname, search, excludePaths]);

    return null;
}

export default ScrollToTop;