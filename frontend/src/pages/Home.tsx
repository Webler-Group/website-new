import Header from "../layouts/Header";

function Home() {
  return (
    <>
      <Header />
      <div className="wb-home">
        <div className="header text-center">
          <p>Welcome to webler</p>
        </div>
      </div>
      {/* Cards Container */}
      <section className="wb-home-why-wb d-flex justify-content-center">
        <div className="row row-cols-1 row-cols-md-3 g-5 text-center ">
          <div className="col">
            <div className="card">
              <img
                src="resources\images\placeHolderImage.jpg"
                className="card-img-top"
                alt="..."
              />
              <div className="card-body">
                <h5 className="card-title">Card title</h5>
                <p className="card-text">
                  This is a longer card with supporting text below as a natural
                  lead-in to additional content. This content is a little bit
                  longer.
                </p>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card">
              <img
                src="resources\images\placeHolderImage.jpg"
                className="card-img-top"
                alt="..."
              />
              <div className="card-body">
                <h5 className="card-title">Card title</h5>
                <p className="card-text">
                  This is a longer card with supporting text below as a natural
                  lead-in to additional content. This content is a little bit
                  longer.
                </p>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card">
              <img
                src="resources\images\placeHolderImage.jpg"
                className="card-img-top"
                alt="..."
              />
              <div className="card-body">
                <h5 className="card-title">Card title</h5>
                <p className="card-text">
                  This is a longer card with supporting text below as a natural
                  lead-in to additional content.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wb-home-perfect-platform d-flex">
         
          <div className="row row-cols-2 row-cols-md-2 g-1 text-center align-self-center">
          <h1 className="text-center">Perfect platform for you</h1>
          <div className="col">
            <div className="card">
              <img
                src="resources\images\placeholderImage1.png"
                className="card-img-top"
                alt="..."
              />
              <div className="card-body">
                <h5 className="card-title">Card title</h5>
                <p className="card-text">
                  This is a longer card with supporting text below as a natural
                  lead-in to additional content. This content is a little bit
                  longer.
                </p>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card">
              <img
                src="resources\images\placeholderImage1.png"
                className="card-img-top"
                alt="..."
              />
              <div className="card-body">
                <h5 className="card-title">Card title</h5>
                <p className="card-text">
                  This is a longer card with supporting text below as a natural
                  lead-in to additional content. This content is a little bit
                  longer.
                </p>
              </div>
            </div>
          </div>
        </div>

      </section>
    </>
  );
}

export default Home;
