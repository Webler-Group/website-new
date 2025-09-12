import { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";

interface ImagePreviewProps {
    src: string;
    onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, onClose }) => {
    const imgRef = useRef<HTMLImageElement>(null);

    const currentScale = useRef<number>(1);
    const translation = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const pinchState = useRef<{
        isPinching: boolean;
        initialDistance: number;
        initialScale: number;
    }>({
        isPinching: false,
        initialDistance: 0,
        initialScale: 1,
    });

    const dragState = useRef<{
        isDragging: boolean;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
    }>({
        isDragging: false,
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
        if (loaded) {
            updateScaleLimits();
        }
    }, [loaded]);

    useEffect(() => {
        const handleResize = () => {
            updateScaleLimits();
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (loaded && currentScale.current > maxScale) {
            currentScale.current = maxScale;
            updateTransform();
        }
    }, [maxScale, loaded]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                // pinch start
                e.preventDefault();
                pinchState.current = {
                    isPinching: true,
                    initialDistance: getDistance(e),
                    initialScale: currentScale.current,
                };
            } else if (e.touches.length === 1) {
                // drag start
                e.preventDefault();
                dragState.current = {
                    isDragging: true,
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    initialX: translation.current.x,
                    initialY: translation.current.y,
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (pinchState.current.isPinching && e.touches.length === 2) {
                // pinch zoom
                e.preventDefault();
                const distance = getDistance(e);
                if (distance > 0 && pinchState.current.initialDistance > 0) {
                    const newScale =
                        pinchState.current.initialScale *
                        (distance / pinchState.current.initialDistance);
                    const clamped = Math.max(
                        minScale,
                        Math.min(newScale, maxScale)
                    );
                    currentScale.current = clamped;
                    updateTransform();
                }
            } else if (dragState.current.isDragging && e.touches.length === 1) {
                // drag move
                e.preventDefault();
                const dx = e.touches[0].clientX - dragState.current.startX;
                const dy = e.touches[0].clientY - dragState.current.startY;
                translation.current.x = dragState.current.initialX + dx;
                translation.current.y = dragState.current.initialY + dy;
                updateTransform();
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                pinchState.current.isPinching = false;
            }
            if (e.touches.length === 0) {
                dragState.current.isDragging = false;
            }
        };

        document.addEventListener("touchstart", handleTouchStart, {
            passive: false,
        });
        document.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        });
        document.addEventListener("touchend", handleTouchEnd, {
            passive: false,
        });

        return () => {
            document.removeEventListener("touchstart", handleTouchStart);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
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
                touchAction: "none",
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
                }}
                onClick={(e) => e.stopPropagation()}
                onLoad={() => setLoaded(true)}
            />
        </div>
    );
};

export default ImagePreview;
