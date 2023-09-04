import PageTitle from "../../../layouts/PageTitle";
import { useEffect, useState } from "react";
import ApiCommunication from "../../../helpers/apiCommunication";
import { Container } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { IBlogEntry } from "../components/BlogEntry";


const Entry = () => {

  PageTitle("Webler - Blog", false);

  const [article, setArticle] = useState<IBlogEntry>();
  const { entryName } = useParams();

  useEffect(() => {
    const getArticle = async () => {
      const result = await ApiCommunication.sendJsonRequest(`/Blog/${entryName}`, 'GET');
      if (result && result.blog) {
        setArticle(result.blog);
      }
    }
    getArticle();
  }, []);

  return (
    <Container fluid>
      <div className="wb-blog">
        {
          article ?
            <div className="py-2">
              <div className="d-flex gap-2 py-2">
                <Link to="/Blog">Webler blog</Link>
                <span>&rsaquo;</span>
                <span>{article.title}</span>
              </div>
              <div className="py-4">
                <h1 className="text-center my-4">{article.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </div>
            </div>
            :
            <div>404 Article not found</div>
        }
      </div>
    </Container>
  )
}

export default Entry;
