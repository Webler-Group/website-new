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
                        <p>Webler or chillpillcoding does not give any waranty or garanty whatsoever.</p>
                        <p>Webler or chillpillcoding is not liable, not responsible for any damages or loss you may have incurred from using our website.</p>
                        <p>Any children below age 18 who register on this website, will be banned and account terminated. <b>You must be 18 years or older to register.</b></p>
                        <p>All users can be banned at any time and for any reason.</p>
                        <p>This website is not a code repo. Your data may be lost someday. You probably should back up the important stuff else where.</p>
                        <p>Users should not try to promote a youtube channel. That may expedite a ban for the user who does this.</p>
                        <p>Users should not publish anything that violates copyright. We take intellectual property very seriously.</p>
                        <p>Users should be respectful towards one another. A failure to do so, may expedite a ban for the user who is disrespectful.</p>
                        <p>Users should keep all content matters coding related: no politics please!.</p>
                        <p>Users should have fun. If it s not fun, then maybe coding is not for you. I suggest trying a different hobby.</p>
                        <p>Please report any concerns to <a href='mailto:info@chillpillcoding.com'>info@chillpillcoding.com.</a></p>
                        <p>We reserve the right to update our terms of use anytime. Make sure to stay up to date with the changes by reading carefully our terms of useeverytime you use this website.</p>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default TermsOfUse;
