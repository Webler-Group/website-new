import { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";

interface ImagePreviewProps {
    src: string;
    onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, onClose }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const currentScale = useRef<number>(1);
    const currentTx = useRef<number>(0);
    const currentTy = useRef<number>(0);
    const initialWidth = useRef<number>(0);
    const initialHeight = useRef<number>(0);
    const centerLeft = useRef<number>(0);
    const centerTop = useRef<number>(0);
    const viewportWidth = useRef<number>(0);
    const viewportHeight = useRef<number>(0);
    const pinchState = useRef<{
        isPinching: boolean;
        initialDistance: number;
        initialScale: number;
    }>({
        isPinching: false,
        initialDistance: 0,
        initialScale: 1,
    });
    const panState = useRef<{
        isPanning: boolean;
        startX: number;
        startY: number;
        startTx: number;
        startTy: number;
    }>({
        isPanning: false,
        startX: 0,
        startY: 0,
        startTx: 0,
        startTy: 0,
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

    const updateScaleLimits = () => {
        const img = imgRef.current;
        const wrapper = wrapperRef.current;
        if (!img || !wrapper) return;
        const visualScale = img.clientWidth / img.naturalWidth;
        setMaxScale(1 / visualScale || 1);
        initialWidth.current = img.clientWidth;
        initialHeight.current = img.clientHeight;
        viewportWidth.current = wrapper.clientWidth;
        viewportHeight.current = wrapper.clientHeight;
        centerLeft.current = (viewportWidth.current - initialWidth.current) / 2;
        centerTop.current = (viewportHeight.current - initialHeight.current) / 2;
        if (img) {
            img.style.position = "absolute";
            img.style.left = `${centerLeft.current}px`;
            img.style.top = `${centerTop.current}px`;
            img.style.width = `${initialWidth.current}px`;
            img.style.height = `${initialHeight.current}px`;
            img.style.maxWidth = "none";
            img.style.maxHeight = "none";
            img.style.objectFit = "none";
            img.style.transformOrigin = "0 0";
            updateImageStyle();
        }
        clampTranslate();
    };

    const clampTranslate = () => {
        const scale = currentScale.current;
        const scaledW = initialWidth.current * scale;
        const scaledH = initialHeight.current * scale;
        const minTx = viewportWidth.current - centerLeft.current - scaledW;
        const maxTx = -centerLeft.current;
        const minTy = viewportHeight.current - centerTop.current - scaledH;
        const maxTy = -centerTop.current;

        if (scaledW > viewportWidth.current) {
            currentTx.current = Math.max(minTx, Math.min(currentTx.current, maxTx));
        } else {
            currentTx.current = 0;
        }

        if (scaledH > viewportHeight.current) {
            currentTy.current = Math.max(minTy, Math.min(currentTy.current, maxTy));
        } else {
            currentTy.current = 0;
        }
    };

    const updateImageStyle = () => {
        const img = imgRef.current;
        if (img) {
            img.style.transform = `translate(${currentTx.current}px, ${currentTy.current}px) scale(${currentScale.current})`;
        }
    };

    useEffect(() => {
        if (loaded) {
            updateScaleLimits();
        }
    }, [loaded]);

    useEffect(() => {
        const handleResize = () => {
            if (loaded) {
                updateScaleLimits();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [loaded]);

    useEffect(() => {
        if (loaded && currentScale.current > maxScale) {
            currentScale.current = maxScale;
            clampTranslate();
            updateImageStyle();
        }
    }, [maxScale, loaded]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const distance = getDistance(e);
                if (distance > 0) {
                    pinchState.current = {
                        isPinching: true,
                        initialDistance: distance,
                        initialScale: currentScale.current,
                    };
                }
            } else if (e.touches.length === 1 && currentScale.current > minScale) {
                e.preventDefault();
                panState.current = {
                    isPanning: true,
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    startTx: currentTx.current,
                    startTy: currentTy.current,
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (pinchState.current.isPinching && e.touches.length === 2) {
                e.preventDefault();
                const distance = getDistance(e);
                if (distance > 0 && pinchState.current.initialDistance > 0) {
                    const newScale = pinchState.current.initialScale * (distance / pinchState.current.initialDistance);
                    const clampedScale = Math.max(minScale, Math.min(newScale, maxScale));
                    if (clampedScale === currentScale.current) return;
                    const oldScale = currentScale.current;
                    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                    const newTx = currentTx.current * (clampedScale / oldScale) + (midX - centerLeft.current) * (1 - clampedScale / oldScale);
                    const newTy = currentTy.current * (clampedScale / oldScale) + (midY - centerTop.current) * (1 - clampedScale / oldScale);
                    currentScale.current = clampedScale;
                    currentTx.current = newTx;
                    currentTy.current = newTy;
                    clampTranslate();
                    updateImageStyle();
                }
            } else if (panState.current.isPanning && e.touches.length === 1) {
                e.preventDefault();
                const deltaX = e.touches[0].clientX - panState.current.startX;
                const deltaY = e.touches[0].clientY - panState.current.startY;
                currentTx.current = panState.current.startTx + deltaX;
                currentTy.current = panState.current.startTy + deltaY;
                clampTranslate();
                updateImageStyle();
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                pinchState.current.isPinching = false;
            }
            if (e.touches.length < 1) {
                panState.current.isPanning = false;
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
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

            <div
                ref={wrapperRef}
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                }}
            >
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
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onLoad={() => setLoaded(true)}
                />
            </div>
        </div>
    );
};

export default ImagePreview;