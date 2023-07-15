import Button from 'react-bootstrap/Button';
import PageTitle from "../layouts/PageTitle";

function QAMainPage() {
    PageTitle("Q&A | Webler");
    return (
        <>
            {/* Main */}
            <main>
                <div className="pageNameBannerTop">
                    <h1>Q&A - Discuss</h1>
                </div>
                <hr />
                <p>Welcome to Webler's Q&A - <b>Q</b>uestions & <b>A</b>nswers. A discussion forum where you ask the questions, and the community of Webler provides you with answers.</p>
                {/* Responsive grid below, rowHome */}
                <div className="rowHome">
                    <div className="col-7">
                        <h5>[Solved] My C++ program is not compiling</h5>
                        <p>Asked by: JOY</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: help, c++, compiler</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> -3 likes - 2 answers - 903 views</span>
                    </div>
                    <div className="col-7">
                        <h5>I cannot activate my messenger?</h5>
                        <p>Asked by: Somya</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: email, chat, message</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 answers - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h5>How do I override CORS setting?</h5>
                        <p>Asked by: Patrick</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: javascript, cors, url</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 answers - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h5>Why isn't my code no.1?</h5>
                        <p>Asked by: Adil</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: hot, today, codes</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 answers - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h5>I can't get string format working in C</h5>
                        <p>Asked by: Tina</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: c, printf, string, char</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 answers - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h5>Why is my codes getting Downvotes?</h5>
                        <p>Asked by: Solomoni Railoa</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: sadness, downvotes, dislike</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> -69 likes - 0 answers - 1403 views</span>
                    </div>
                    <div className="col-7">
                        <h5>[MFD] Hi friends!</h5>
                        <p>Asked by: Ash Raju</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: wow, hey, hai</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> -4 likes - 0 answers - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h5>My PRO subs is not working</h5>
                        <p>Asked by: Scott D</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: subs, paid, pro</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 answers - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h5>How do I cancel my TRIAL ?</h5>
                        <p>Asked by: Peter Pan</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: playstore, google, trial</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 answers - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h5>What is the time complexity of Djikstra's algorithm?</h5>
                        <p>Asked by: Heal Phill</p>
                        <p>Date: dd/mm/yyyy hh/mm/ss</p>
                        <p>Tags: path, short, optimize</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">View discussion</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 answers - 403 views</span>
                    </div>
                </div>
            </main>
        </>
    );
}

export default QAMainPage;