import { Container } from "react-bootstrap";
import PageTitle from "../layouts/PageTitle";


const TermsOfUse = () => {

    PageTitle("Webler - Terms of Use", false);

    return (
        <Container>
            <div className="wb-term-conditions-container">
                <div className="wb-term-conditions">
                    <div >
                        <h1>Terms & Conditions</h1>
                    </div>
                    <hr className="mb-4" />
                    <div>
                        <p>Terms of Use</p>
                        <p>Last revised: Oct 27, 2023</p>
                        <br />
                        <p>Please note that your use of and access to our services are subject to the following Terms; if you do not agree to all of the following, you may not use or access the services in any manner.</p>
                        <br />
                        <p>Welcome to Webler! Please read these Terms of Use (these “Terms”) carefully before using the website(s) (including https://www.webler.com/), products, services and applications (the “Services”) operated by Webler Inc. ("Webler", "us", "we", or "our"). </p>
                                                
                        
                        
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default TermsOfUse;
