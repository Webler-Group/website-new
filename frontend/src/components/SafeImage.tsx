import { ImgHTMLAttributes, SyntheticEvent, useState } from "react";

// URLs that failed to load during this page session. Browsers don't cache failed
// image responses, so without this every remount would re-request a broken URL.
const failedImageUrls = new Set<string>();

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    fallbackSrc: string;
}

const SafeImage = ({ src, fallbackSrc, onError, ...rest }: SafeImageProps) => {
    const [, forceUpdate] = useState(0);

    const failed = !src || failedImageUrls.has(src);

    const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
        if (src && !failedImageUrls.has(src)) {
            failedImageUrls.add(src);
            forceUpdate(n => n + 1);
        }
        onError?.(e);
    };

    return (
        <img
            {...rest}
            src={failed ? fallbackSrc : src}
            onError={failed ? undefined : handleError}
        />
    );
};

export default SafeImage;
