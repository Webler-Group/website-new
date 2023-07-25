
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
      <section className="wb-home-why-wb">
        <div className="px-4 text-center">
          <div className="row gx-5">
            <div className="col">
              <div className="card">
                <img src="resources\images\CardImage.jpg" className="card-img-top" alt="..." />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    Consequuntur architecto officiis illo perspiciatis!
                    Excepturi deleniti impedit aut, distinctio tempora
                    reiciendis, blanditiis ea quibusdam, nihil repellat quidem
                    officia eveniet sapiente saepe.
                  </p>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card">
                <img src="resources\images\pctemplate.png" className="card-img-top" alt="..." />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    Vitae, corrupti. Reprehenderit nobis ad facere libero ipsum
                    et ipsam dolores ratione laudantium praesentium vero fuga
                    nam maiores, voluptatum quisquam voluptate blanditiis!
                  </p>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card">
                <img src="resources\images\placeHolderImage.jpg" className="card-img-top" alt="..." />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    Vitae, corrupti. Reprehenderit nobis ad facere libero ipsum
                    et ipsam dolores ratione laudantium praesentium vero fuga
                    nam maiores, voluptatum quisquam voluptate blanditiis!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
