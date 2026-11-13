import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaAngleDoubleLeft, FaCheck, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { cx } from "../../../components/ui";
import { ChallengeCollectionDetails } from "../types";

interface ChallengeCollectionNavigatorProps {
    collection: ChallengeCollectionDetails;
    currentId: string;
    onHide: () => void;
}

const ChallengeCollectionNavigator = ({ collection, currentId, onHide }: ChallengeCollectionNavigatorProps) => {
    const [openSections, setOpenSections] = useState<Set<number>>(new Set());
    const bodyRef = useRef<HTMLDivElement>(null);

    const unique = [...new Map(collection.sections.flatMap(s => s.challenges).map(c => [c.id, c])).values()];
    const solved = unique.filter(c => c.isSolved).length;

    // Open the section of the current challenge whenever it changes, keeping the sections the user opened
    useEffect(() => {
        const index = collection.sections.findIndex(s => s.challenges.some(c => c.id === currentId));
        if (index >= 0) {
            setOpenSections(open => open.has(index) ? open : new Set(open).add(index));
        }
    }, [collection, currentId]);

    // Scroll the panel (not the page) so the current challenge is visible
    useEffect(() => {
        const body = bodyRef.current;
        const active = body?.querySelector<HTMLElement>(".wb-challenges-navigator-problem--active");
        if (!body || !active) return;
        const top = active.offsetTop - body.offsetTop;
        if (top < body.scrollTop || top + active.offsetHeight > body.scrollTop + body.clientHeight) {
            body.scrollTop = top - body.clientHeight / 2 + active.offsetHeight / 2;
        }
    }, [currentId, openSections]);

    const toggle = (index: number) => {
        setOpenSections(open => {
            const next = new Set(open);
            if (next.has(index)) next.delete(index); else next.add(index);
            return next;
        });
    };

    return (
        <aside className="wb-challenges-navigator d-none d-xl-flex">
            <div className="wb-challenges-navigator-header">
                <div className="d-flex align-items-start justify-content-between gap-2">
                    <Link to={`/Challenge/Collection/${collection.id}`} className="wb-challenges-navigator-title">
                        {collection.title}
                    </Link>
                    <button type="button" className="wb-challenges-navigator-hide" onClick={onHide} title="Hide the problem list">
                        <FaAngleDoubleLeft size={12} />
                    </button>
                </div>
                <div className="small text-muted mt-1">{solved} / {unique.length} solved</div>
            </div>
            <div className="wb-challenges-navigator-body" ref={bodyRef}>
                {collection.sections.map((section, index) => {
                    const open = openSections.has(index);
                    const sectionSolved = section.challenges.filter(c => c.isSolved).length;
                    return (
                        <div key={section.title}>
                            <button type="button" className="wb-challenges-navigator-section" onClick={() => toggle(index)} aria-expanded={open}>
                                {open ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                <span className="flex-grow-1 text-truncate">{index + 1}. {section.title}</span>
                                <span className="wb-challenges-navigator-count">{sectionSolved}/{section.challenges.length}</span>
                            </button>
                            {open && section.challenges.map(challenge => (
                                <Link
                                    key={challenge.id}
                                    to={`/Challenge/${challenge.id}?collection=${collection.id}`}
                                    className={cx("wb-challenges-navigator-problem",
                                        challenge.id === currentId && "wb-challenges-navigator-problem--active")}
                                    title={challenge.title}
                                >
                                    <span className="wb-challenges-navigator-status">
                                        {challenge.isSolved && <FaCheck size={10} className="text-success" />}
                                    </span>
                                    <span className="flex-grow-1 text-truncate">{challenge.title}</span>
                                    <span className={`wb-challenges-navigator-dot wb-challenges-navigator-dot--${challenge.difficulty}`}
                                        title={challenge.difficulty} />
                                </Link>
                            ))}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};

export default ChallengeCollectionNavigator;
