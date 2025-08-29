
import PageTitle from "../layouts/PageTitle";

const Contact = () => {
  PageTitle("Contact", false);
  return (
    <>
      <div className="wb-contact-page">
        <div className="wb-contact-form container">
          <h3 className="mb-4">Email us</h3>
          <div className="mb-3 ">
            <label htmlFor="exampleFormControlInput2" className="form-label">
              Your name
            </label>
            <input
              type="text"
              className="form-control "
              id="exampleFormControlInput2"
              placeholder="name"
            />

            <label htmlFor="exampleFormControlInput1" className="form-label">
              Email address
            </label>

            <input
              type="email"
              className="form-control  mb-3"
              id="exampleFormControlInput1"
              placeholder="name@example.com"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="exampleFormControlTextarea1" className="form-label">
              Example textarea
            </label>
            <textarea
              className="form-control mb-4"
              id="exampleFormControlTextarea1"
              rows={3}
            ></textarea>
          </div>
          <button className="btn btn-primary btn-lg" type="submit">Submit</button>
        </div>
      </div>
    </>
  );
};

export default Contact;
