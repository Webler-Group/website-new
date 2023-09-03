import PageTitle from "../../../layouts/PageTitle";
import { ReactNode, useEffect, useState } from "react";
import ApiCommunication from "../../../helpers/apiCommunication";
import { Container } from "react-bootstrap";

import {IBlogEntry} from '../components/BlogEntry';
import BlogEntry from '../components/BlogEntry';

const Blog = () => {

  PageTitle("Webler - Blog", false);

  const [blogEntries, setBlogEntries] = useState([]);

  useEffect(() => {
    const getBlogEntries = async () => {
      const result = await ApiCommunication.sendJsonRequest(`/Blog`, "GET");
      setBlogEntries(result);
    }
    getBlogEntries()
  }, []);

  return (
    <Container>
        <h2>Blog Entries</h2>
        {blogEntries.map((blogEntry)=>{
          return (
          <BlogEntry title={blogEntry.title} content={blogEntry.content} date={blogEntry.date} link={blogEntry.link} />
          )
        })}
    </Container>
  )
}

export default Blog;
