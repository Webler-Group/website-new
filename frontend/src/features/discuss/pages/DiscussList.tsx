import { ChangeEvent, useEffect, useState } from 'react'
import { useApi } from '../../../context/apiCommunication';
import Question from '../components/Question';
import { useAuth } from '../../auth/context/authContext';
import { PaginationControl } from 'react-bootstrap-pagination-control';
import QuestionPlaceholder from '../components/QuestionPlaceholder';
import { Link, useSearchParams } from 'react-router-dom';
import { TagSearch } from '../../../components/InputTags';
import { Search } from 'lucide-react';

const QuestionList = () => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const [questions, setQuestions] = useState<any[]>([]);
    const questionsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [questionCount, setQuestionCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        getQuestions();
    }, [searchParams]);

    useEffect(() => {
        handlePageChange(1);
    }, [filter, searchQuery]);

    useEffect(() => {
        if (searchParams.has("page")) {
            setCurrentPage(Number(searchParams.get("page")))
        }
        if (searchParams.has("filter")) {
            setFilter(Number(searchParams.get("filter")))
        }
        if (searchParams.has("query")) {
            setSearchQuery(searchParams.get("query")!)
        }
    }, []);

    const handlePageChange = (page: number) => {
        if (currentPage === page) {
            return
        }
        searchParams.set("page", page.toString());
        setSearchParams(searchParams, { replace: true })
        setCurrentPage(page);
    }

    const handleSearch = (value: string) => {
        searchParams.set("query", value);
        setSearchParams(searchParams, { replace: true });
        setSearchQuery(value);
    }

    const getQuestions = async () => {
        setLoading(true);
        const page = searchParams.has("page") ? Number(searchParams.get("page")) : 1;
        const filter = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
        const searchQuery = searchParams.has("query") ? searchParams.get("query")! : "";
        const result = await sendJsonRequest(`/Discussion`, "POST", {
            page,
            count: questionsPerPage,
            filter,
            searchQuery,
            userId: userInfo ? userInfo.id : null
        });
        if (result && result.questions) {
            setQuestions(result.questions);
            setQuestionCount(result.count);
        }
        setLoading(false);
    }

    const handleFilterSelect = (e: ChangeEvent) => {
        const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value)
        searchParams.set("filter", value.toString())
        setSearchParams(searchParams, { replace: true })
        setFilter(value)
    }

    let placeholders = [];
    for (let i = 0; i < questionsPerPage; ++i) {
        placeholders.push(<QuestionPlaceholder key={i} />);
    }

    return (
        <>
        {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center w-full sm:w-2/3 border rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by tags or title..."
                className="ml-2 flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-200"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button onClick={handleSearch} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">Search</button>
            </div>
    
            <select
              className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              value={filter} onChange={handleFilterSelect}
            >
                <option value="1">Most Recent</option>
                <option value="2">Unanswered</option>
                <option value="6">Trending</option>
                {
                    userInfo &&
                    <>
                        <option value="3">My Questions</option>
                        <option value="4">My Answers</option>
                    </>
                }
            </select>
          </div>
    
          {/* Ask Question Link */}
          <div className="flex justify-end">
            <Link
              to="/Discuss/New"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Ask a Question
            </Link>
          </div>
    
          {/* Discussion List */}
          <div className="space-y-4">
            {
              loading ?
                  <div className="wb-discuss-empty-questions">
                    <h3>Loading</h3>
                  </div>
                  :
                  questionCount == 0 ?
                      <div className="wb-discuss-empty-questions">
                          <h3>Nothing to show</h3>
                      </div>
                      :
                      questions.map(question => {
                          return (
                              <Question question={question} searchQuery={searchQuery} key={question.id} showUserProfile={true} />
                          )
                      })

            }
          </div>

            {/* <div className='my-3'>
                <PaginationControl
                    page={currentPage}
                    between={3}
                    total={questionCount}
                    limit={questionsPerPage}
                    changePage={handlePageChange}
                    ellipsis={1}
                />
            </div> */}
        </>
        // <div className="d-flex flex-column">
        //     <h2>Q&A Discussions</h2>
        //     <div className="d-flex mt-2" style={{ gap: "0.5rem" }}>
        //         <div style={{ flex: 1 }}>
        //             <TagSearch
        //                 query={searchInput}
        //                 onChange={(val) => setSearchInput(val)}
        //                 onSelect={(tag) => {
        //                     setSearchInput(tag);
        //                 }}
        //                 placeholder="Search by tags or title..."
        //                 maxWidthPx={360}
        //             />
        //         </div>
        //         <Button size="sm" >Search</Button>
        //     </div>
    )
}

export default QuestionList