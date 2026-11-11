import { useEffect, useState } from "react";
import { Badge, FormControl, ListGroup } from "react-bootstrap";
import { FaLock, FaPlus } from "react-icons/fa";
import { useApi } from "../../../context/apiCommunication";
import { ChallengeSearchItem, SearchChallengesData } from "../types";

interface ChallengeSearchBoxProps {
    excludeIds: Set<string>;
    onSelect: (challenge: ChallengeSearchItem) => void;
}

const ChallengeSearchBox = ({ excludeIds, onSelect }: ChallengeSearchBoxProps) => {
    const { sendJsonRequest } = useApi();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ChallengeSearchItem[]>([]);

    useEffect(() => {
        const timeout = setTimeout(async () => {
            const result = await sendJsonRequest<SearchChallengesData>("/Challenge/Search", "POST", { query });
            setResults(result.data?.challenges ?? []);
        }, 250);
        return () => clearTimeout(timeout);
    }, [query]);

    const visible = results.filter(c => !excludeIds.has(c.id));

    return (
        <div>
            <FormControl
                size="sm"
                placeholder="Search challenges by title..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
            />
            <ListGroup className="wb-collection-search-results mt-1">
                {visible.map(c => (
                    <ListGroup.Item key={c.id} action className="d-flex align-items-center gap-2 py-1 small" onClick={() => onSelect(c)}>
                        <FaPlus size={10} className="text-primary" />
                        <span className="flex-grow-1">{c.title}</span>
                        {!c.isPublic && <FaLock size={10} className="text-muted" />}
                        <Badge bg="light" text="dark" className="border fw-normal">{c.difficulty}</Badge>
                    </ListGroup.Item>
                ))}
                {visible.length === 0 && <ListGroup.Item className="small text-muted py-1">No matching challenges</ListGroup.Item>}
            </ListGroup>
        </div>
    );
};

export default ChallengeSearchBox;
