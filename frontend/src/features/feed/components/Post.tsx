import { useState } from "react";
import { Container } from "react-bootstrap";

const Post = () => {

  const [file, setFile] = useState("");
  const [title , setTitle] = useState("");
  const [content , setContent] = useState("");

  function handleImageChange(e: any) {
    setFile(URL.createObjectURL(e.target.files[0]));
  }

  function handleTitleChange(e: any) {
    setTitle(e.target.value);
  }

  function handleContentChange(e: any) {
    setContent(e.target.value);
  }




  let posts_Data = [
    {
      title: "Title1",
      content:
        " With supporting text below as a natural lead-in to additional content.",
      src: "resources/images/SpiderMascot.png",
    },
    {
      title: "Title2",
      content:
        " With supporting text below as a natural lead-in to additional content.",
      src: "resources/images/logo.png",
    },
    {
      title: "Title3",
      content:
        " With supporting text below as a natural lead-in to additional content.",
      src: "resources/images/logo.png",
    },
    {
      title: "Title4",
      content:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore, natus, laboriosam culpa libero a sunt vel accusamus non eius cum molestias repudiandae quis maxime praesentium fugiat porro temporibus facilis similique!",
      src: "resources/images/placeholderImage1.png",
    },
  ];

  const [post, createPost] = useState(posts_Data);

  const posts = post.map((item , index) => {
    return (
      <div className="card mb-3 wb-post" key={index}>
        <div className="card-body">
          <h5 className="card-title">{item.title}</h5>
          <p className="card-text">{item.content}</p>
          <img src={item.src} className="img-thumbnail w-100" />
        </div>
      </div>
    );
  });

  let newPost = {
    title: title,
    content: content,
    src: file,
  };

  function handleCreatePost() {
    createPost((current) => [ newPost , ...current ]);
  }

  return (
    <>
      <section className="wb-feed-posts-container">
        {/* Create post area ___START */}
        <Container className="wb-feature-create_posts mb-5">
          <div className="mb-3">
            <label htmlFor="exampleFormControlInput1" className="form-label">
              Title
            </label>
            <input
              type="text"
              className="form-control"
              id="exampleFormControlInput1"
              placeholder="My post title"
              onChange={handleTitleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="exampleFormControlTextarea1" className="form-label">
              Content
            </label>
            <textarea
              className="form-control"
              id="exampleFormControlTextarea1"
              rows={3}
              onChange={handleContentChange}
            ></textarea>
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
            onChange={handleImageChange}
          />
          <img src={file} className="img-thumbnail" />
          <button
            className="btn btn-primary"
            type="submit"
            onClick={handleCreatePost}
          >
            Publish
          </button>
        </Container>

        {/* Create post area___END */}

        <Container className="wb-feed-posts">
          <div className="row row-cols-1 row-cols-lg-1 g-5 g-lg-3">
            <div className="col">
              <div className="p-3">{posts}</div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Post;
