import { Container } from "../components/ui";
import PageTitle from "../layouts/PageTitle";

const ContactPage = () => {
  PageTitle("Contact", false);

  return (
    <div className="bg-body-tertiary py-4 min-vh-100">
      <Container>
        <div className="bg-body rounded p-4 shadow">
          <h2 className="mb-3">Contact Us</h2>
          <p className="mb-2">
            We'd love to hear from you! For support or any inquiries, feel free to reach out to us.
          </p>
          <p className="fw-bold">
            Email:{" "}
            <a href="mailto:support@weblercodes.com" className="text-primary">
              support@weblercodes.com
            </a>
          </p>
        </div>
      </Container>
    </div>
  );
};

export default ContactPage;
