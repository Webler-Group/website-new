import { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";

interface ImagePreviewProps {
    src: string;
    onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, onClose }) => {
    const imgRef = useRef<HTMLImageElement | null>(null);

    const currentScale = useRef<number>(1);
    const translation = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // gesture tracker: set ONLY on touchstart and not changed mid-gesture
    const gesture = useRef<"none" | "pinch" | "drag">("none");

    const pinchData = useRef<{ initialDistance: number; initialScale: number }>({
        initialDistance: 0,
        initialScale: 1,
    });

    const dragData = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
    });

    const [maxScale, setMaxScale] = useState<number>(1);
    const minScale = 1;
    const [loaded, setLoaded] = useState(false);

    const getDistance = (e: TouchEvent): number => {
        if (e.touches.length < 2) return 0;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const updateTransform = () => {
        const img = imgRef.current;
        if (img) {
            img.style.transform = `translate(${translation.current.x}px, ${translation.current.y}px) scale(${currentScale.current})`;
        }
    };

    const updateScaleLimits = () => {
        const img = imgRef.current;
        if (!img) return;
        const initialVisualScale = img.clientWidth / img.naturalWidth;
        if (initialVisualScale > 0) {
            setMaxScale(1 / initialVisualScale);
        }
    };

    useEffect(() => {
        if (loaded) updateScaleLimits();
    }, [loaded]);

    useEffect(() => {
        const onResize = () => updateScaleLimits();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        if (loaded && currentScale.current > maxScale) {
            currentScale.current = maxScale;
            updateTransform();
        }
    }, [maxScale, loaded]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // Only start handling gestures if the initial touch was on the image
            const target = e.target as Node | null;
            const startedOnImg = imgRef.current ? imgRef.current.contains(target) : false;
            if (!startedOnImg) {
                // don't interfere with touches that started elsewhere (close button, background, ...)
                return;
            }

            // prevent scrolling/pinch-zoom of the page for touches that start on the image
            e.preventDefault();

            if (e.touches.length >= 2) {
                // start pinch gesture
                gesture.current = "pinch";
                pinchData.current = {
                    initialDistance: getDistance(e),
                    initialScale: currentScale.current,
                };
            } else {
                // start drag gesture (ONLY if it started as single-finger)
                gesture.current = "drag";
                dragData.current = {
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    initialX: translation.current.x,
                    initialY: translation.current.y,
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            // If gesture was not started on image, ignore
            if (gesture.current === "none") return;

            // If gesture was started as pinch, handle pinch only when two touches are present
            if (gesture.current === "pinch") {
                if (e.touches.length < 2) {
                    // do not convert to drag — we keep gesture 'pinch' until all touches end
                    return;
                }
                e.preventDefault();
                const distance = getDistance(e);
                if (distance > 0 && pinchData.current.initialDistance > 0) {
                    const newScale = pinchData.current.initialScale * (distance / pinchData.current.initialDistance);
                    const clamped = Math.max(minScale, Math.min(newScale, maxScale));
                    currentScale.current = clamped;
                    updateTransform();
                }
                return;
            }

            // If gesture started as drag, handle single-finger moves
            if (gesture.current === "drag") {
                if (e.touches.length < 1) return;
                e.preventDefault();
                const dx = e.touches[0].clientX - dragData.current.startX;
                const dy = e.touches[0].clientY - dragData.current.startY;
                translation.current.x = dragData.current.initialX + dx;
                translation.current.y = dragData.current.initialY + dy;
                updateTransform();
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            // If no more touches, end gesture fully and allow new gestures to start normally
            if (e.touches.length === 0) {
                gesture.current = "none";
            }
            // otherwise: keep the gesture type as it was until all touches end.
            // this prevents switching pinch -> drag mid-gesture.
        };

        document.addEventListener("touchstart", handleTouchStart, { passive: false });
        document.addEventListener("touchmove", handleTouchMove, { passive: false });
        document.addEventListener("touchend", handleTouchEnd, { passive: false });
        document.addEventListener("touchcancel", handleTouchEnd, { passive: false });

        return () => {
            document.removeEventListener("touchstart", handleTouchStart);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
            document.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [maxScale]);

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0, 0, 0, 0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                // important: don't block touch behavior for non-image elements (close button)
                touchAction: "auto",
            }}
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    fontSize: "1.8rem",
                    cursor: "pointer",
                    zIndex: 10,
                }}
            >
                <FaTimes />
            </button>

            <img
                ref={imgRef}
                src={src}
                alt=""
                style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    transform: `translate(${translation.current.x}px, ${translation.current.y}px) scale(${currentScale.current})`,
                    transformOrigin: "center",
                    // allow handling of touch gestures only on the image itself
                    touchAction: "none",
                }}
                onClick={(e) => e.stopPropagation()}
                onLoad={() => setLoaded(true)}
            />
        </div>
    );
};

export default ImagePreview;
