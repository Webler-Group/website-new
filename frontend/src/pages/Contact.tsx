import Footer from "../layouts/Footer";
import Header from "../layouts/Header";
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
      <Footer/>
    </>
  );
};

export default Contact;
