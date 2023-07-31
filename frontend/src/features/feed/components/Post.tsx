import { useState } from "react";
import { Container } from "react-bootstrap";

const Post = () => {

  const [file, setFile] = useState("");
  function handleChange(e : any) {
      console.log(e.target.files);
      setFile(URL.createObjectURL(e.target.files[0]));
  }
  
  return (
    <>

      <Container className="wb-feature-posts mt-5 mb-5">
        <div className="mb-3">
          <label htmlFor="exampleFormControlInput1" className="form-label">
            Title
          </label>
          <input
            type="text"
            className="form-control"
            id="exampleFormControlInput1"
            placeholder="My post title"
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="exampleFormControlTextarea1" className="form-label">
            Content
          </label>
          <textarea className="form-control" id="exampleFormControlTextarea1" rows={3}></textarea>
        </div>
        <label htmlFor="InputImage" className="form-label">
            Select a image
          </label>
          <input
            type="file"
            accept="images/*"
            className="form-control"
            id="InputImage"
            placeholder="My post title"
            onChange={handleChange}
          />
          <img src={file} className="img-thumbnail"/>
          <button className="btn btn-primary" type="submit">Publish</button>

      </Container>
    </>
  );
};

export default Post;
