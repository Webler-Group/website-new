import { LinkContainer } from "react-router-bootstrap";
import { Link } from "react-router-dom";

interface IBlogEntry {
  title: string;
  content: string;
  date: string;
  name: string;
  author: string;
}

interface BlogEntryProps {
  entry: IBlogEntry;
  searchQuery: string;
}

const BlogEntry = ({ entry }: BlogEntryProps) => {

  let link = `/Blog/${entry.name}`;

  let title = entry.title;

  return (
    <div className="bg-light rounded border p-3 d-flex flex-column gap-3">
      <LinkContainer to={link}>
        <h1 className="wb-blog__content-item__title mt-3">{title}</h1>
      </LinkContainer>
      <div className="text-secondary">
        {entry.date}
      </div>
      <p>{entry.content}</p>
      <div>
        <Link to={link}>Read &rsaquo;</Link>
      </div>
    </div>
  );
};

export type { IBlogEntry }

export default BlogEntry;
