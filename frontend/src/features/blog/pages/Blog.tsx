import PageTitle from "../../../layouts/PageTitle";
import { FormEvent, useEffect, useRef, useState } from "react";
import ApiCommunication from "../../../helpers/apiCommunication";

import { IBlogEntry } from '../components/BlogEntry';
import BlogEntry from '../components/BlogEntry';
import { Button, Container, Form, FormControl } from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { useSearchParams } from "react-router-dom";

const Blog = () => {

  PageTitle("Webler - Blog", false);

  const entriesPerPage = 10;
  const [entriesCount, setEntriesCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [blogEntries, setBlogEntries] = useState<IBlogEntry[]>([]);
  const searchInputElement = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBlogEntries();
  }, [searchParams]);

  useEffect(() => {
    handlePageChange(1);
  }, [searchQuery]);

  useEffect(() => {
    if (searchParams.has("page")) {
      setCurrentPage(Number(searchParams.get("page")))
    }
    if (searchParams.has("query")) {
      setSearchQuery(searchParams.get("query")!)
    }
  }, []);

  const getBlogEntries = async () => {
    setLoading(true);
    const page = searchParams.has("page") ? Number(searchParams.get("page")) : 1;
    const searchQuery = searchParams.has("query") ? searchParams.get("query")! : "";
    const result = await ApiCommunication.sendJsonRequest(`/Blog?page=${page}&count=${entriesPerPage}&query=${searchQuery}`, "GET");
    if (result && result.posts) {
      setBlogEntries(result.posts);
      setEntriesCount(result.count);
    }
    setLoading(false);
  }

  const handlePageChange = (page: number) => {
    if (currentPage === page) {
      return
    }
    searchParams.set("page", page.toString());
    setSearchParams(searchParams, { replace: true })
    setCurrentPage(page);
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();

    if (searchInputElement.current) {
      const value = searchInputElement.current.value.trim()
      searchParams.set("query", value);
      setSearchParams(searchParams, { replace: true });
      setSearchQuery(value);
    }
  }

  return (
    <Container fluid>
      <div className="wb-blog p-2">
        <h1 className="my-4 text-center">Blog</h1>
        <Form className="d-flex mt-4" onSubmit={handleSearch}>
          <FormControl type="search" placeholder="Search..." ref={searchInputElement} />
          <Button className="ms-2" type="submit">Search</Button>
        </Form>
        <div className="row row-cols-1 row-cols-md-2 g-3 my-3">
          {
            loading ?
              <p>Loading...</p>
              :
              blogEntries.length === 0 ?
                <div className="wb-discuss-empty-questions">
                  <h3>Nothing to show</h3>
                </div>
                :
                blogEntries.map((blogEntry) => {
                  return (
                    <div className="col">
                      <BlogEntry key={blogEntry.name} entry={blogEntry} searchQuery={searchQuery} />
                    </div>
                  )
                })
          }
        </div>
        <div>
          <PaginationControl
            page={currentPage}
            between={3}
            total={entriesCount}
            limit={entriesPerPage}
            changePage={handlePageChange}
            ellipsis={1}
          />
        </div>
      </div>
    </Container>
  )
}

export default Blog;
