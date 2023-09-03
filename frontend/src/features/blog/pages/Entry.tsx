import PageTitle from "../../../layouts/PageTitle";
import { ReactNode, useEffect, useState } from "react";
import ApiCommunication from "../../../helpers/apiCommunication";
import { Container } from "react-bootstrap";
import { useParams } from "react-router-dom";


const Entry = () => {

  PageTitle("Webler - Blog", false);

  const [article, setArticle] = useState("");
  const { entryName } = useParams();

  useEffect(() => {
    const getArticle = async () => {
      const result = await ApiCommunication.sendJsonRequest(`/Blog/${entryName}`,'GET');
      setArticle(result);
    }
    getArticle();
  }, []);

  return (
    <Container>
        <div dangerouslySetInnerHTML={{__html: article.content}} />
    </Container>
  )
}

export default Entry;
