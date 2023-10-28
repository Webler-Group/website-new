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
                        <p>Webler or chillpillcoding does not give any warantee or garantee as to the accuracy of its content.</p>
                        <p>Webler or chillpillcoding is not liable, not responsible for any damages or loss you may have incurred while using our website.</p>
                        <p>Any children below age 16 who register on this website, will be banned and account terminated.</p>
                        <p>All users can be banned at any time and for any reason.</p>
                        <p>This website is not a code repo. Your data may be lost someday. You probably should back up the important stuff else where</p>
                        <p>Users should not try to promote a youtube channel. That may expedite a ban for the user who does this.</p>
                        <p>Users should not publish anything that violates copyright. We take intellectual property very seriously.</p>
                        <p>Users should be respectful towards one another. A failure to do so, may expedite a ban for the user who is disrespectful.</p>
                        <p>Users should keep all content matters coding related: no politics please!.</p>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default TermsOfUse;
