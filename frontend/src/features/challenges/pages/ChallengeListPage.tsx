import { Button, Form, FormControl, Row, Col } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IChallenge } from "../types";
import { PaginationControl } from "../../../components/ModernPagination";
import Loader from "../../../components/Loader";
import PageTitle from "../../../layouts/PageTitle";
import { useApi } from "../../../context/apiCommunication";
import { ChangeEvent, useEffect, useState, useMemo } from "react";
import { LinkContainer } from "react-router-bootstrap";
import { useAuth } from "../../auth/context/authContext";
import ChallengeCard from "../components/ChallengeCard";

const ChallengeList = () => {
  PageTitle("Code Challenge");

  const { sendJsonRequest } = useApi();
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const challengesPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [challengeCount, setChallengeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    getChallenges();
  }, [currentPage, difficulty, searchQuery]);

  useEffect(() => {
    if (searchParams.has("page")) {
      setCurrentPage(Number(searchParams.get("page")));
    }
    if (searchParams.has("difficulty")) {
      setDifficulty(searchParams.get("difficulty")!);
    }
    if (searchParams.has("status")) {
      setStatus(searchParams.get("status")!);
    }
    if (searchParams.has("query")) {
      setSearchQuery(searchParams.get("query")!);
      setSearchInput(searchParams.get("query")!);
    }
  }, []);

  const handlePageChange = (page: number) => {
    if (currentPage === page) {
      return;
    }
    searchParams.set("page", page.toString());
    setSearchParams(searchParams, { replace: true });
    setCurrentPage(page);
  };

  const handleSearch = () => {
    searchParams.set("query", searchInput);
    setSearchParams(searchParams, { replace: true });
    setSearchQuery(searchInput);
  };

  const getChallenges = async () => {
    setLoading(true);
    const result = await sendJsonRequest(`/Challenge`, "POST", {
      page: currentPage,
      count: challengesPerPage,
      difficulty: difficulty !== "all" ? difficulty : null,
      searchQuery: searchQuery,
    });
    if (result && result.challenges) {
      setChallenges(result.challenges);
      setChallengeCount(result.count);
    }
    setLoading(false);
  };

  const handleDifficultySelect = (e: ChangeEvent) => {
    const value = (e.target as HTMLSelectElement).selectedOptions[0].value;
    if (value === "all") {
      searchParams.delete("difficulty");
    } else {
      searchParams.set("difficulty", value);
    }
    setSearchParams(searchParams, { replace: true });
    setDifficulty(value);
    setCurrentPage(1);
    searchParams.set("page", "1");
  };

  const handleStatusSelect = (e: ChangeEvent) => {
    const value = (e.target as HTMLSelectElement).selectedOptions[0].value;
    if (value === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", value);
    }
    setSearchParams(searchParams, { replace: true });
    setStatus(value);
  };

  const filteredChallenges = useMemo(() => {
    if (status === "all") {
      return challenges;
    }

    return challenges.filter((challenge: IChallenge) => {
      const isPassed = challenge.submissions?.some((sub) => sub.passed);
      if (status === "solved") {
        return isPassed;
      } else if (status === "unsolved") {
        return !isPassed;
      }
      return true;
    });
  }, [challenges, status]);

  return (
    <div className="challenge-list-container">
      <div className="d-flex gap-2 align-items-center mb-3">
        <FormControl
          id="search"
          type="search"
          size="sm"
          placeholder="Search challenges..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          className="flex-grow-1"
        />
        <Button size="sm" onClick={handleSearch} variant="primary">
          Search
        </Button>
      </div>
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2">
          <Form.Group>
            <Form.Select
              id="difficulty"
              size="sm"
              value={difficulty}
              onChange={handleDifficultySelect}
              style={{ width: "120px" }}
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Select
              id="status"
              size="sm"
              value={status}
              onChange={handleStatusSelect}
              style={{ width: "120px" }}
            >
              <option value="all">All Statuses</option>
              <option value="unsolved">Unsolved</option>
              <option value="solved">Solved</option>
            </Form.Select>
          </Form.Group>
        </div>
        {userInfo?.roles.some((x) => ["Admin", "Creator"].includes(x)) && (
          <LinkContainer to="/Challenge/Create">
            <Button size="sm">
              New Challenge
            </Button>
          </LinkContainer>
        )}
      </div>

      <div className="challenge-list">
        {loading ? (
          <Loader />
        ) : filteredChallenges.length === 0 ? (
          <div className="wb-empty-list text-center py-4">
            <h3>No Challenges Found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <Row className="g-1">
            {filteredChallenges.map((challenge: IChallenge, idx) => (
              <Col key={idx} xs={12}>
                <ChallengeCard challenge={challenge} i={idx} />
              </Col>
            ))}
          </Row>
        )}
      </div>

      <div className="my-3">
        <PaginationControl
          page={currentPage}
          between={3}
          total={challengeCount}
          limit={challengesPerPage}
          changePage={handlePageChange}
          ellipsis={1}
        />
      </div>
    </div>
  );
};

export default ChallengeList;