import Header from "../layouts/Header";
import Footer from "../layouts/Footer";
import PageTitle from "../layouts/PageTitle";

const Contact = () => {

  PageTitle("Webler - Contact", false);
  return (
    <>
      <Header variant="light"/>
      
      <div className="mb-3">
        <label htmlFor="exampleFormControlInput1" className="form-label">
          Email address
        </label>
        <input
          type="email"
          className="form-control"
          id="exampleFormControlInput1"
          placeholder="name@example.com"
        />
      </div>
      <div className="mb-3">
        <label htmlFor="exampleFormControlTextarea1" className="form-label">
          Example textarea
        </label>
        <textarea
          className="form-control"
          id="exampleFormControlTextarea1"
          rows={3}
        ></textarea>
      </div>

      <Footer />
    </>
  );
};

export default Contact;
