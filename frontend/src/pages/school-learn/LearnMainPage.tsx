import Button from 'react-bootstrap/Button';
import PageTitle from "../../partials/PageTitle";

/*

 This acts as the school (Learn) homepage

 Student is expected to select between Courses or Quizzes.

*/

function Learn() {
    PageTitle("Learn | Webler");
    return (
        <>
            {/* Main */}
            <main>
                <div className="pageNameBannerTop">
                    <h1>Learn</h1>
                </div>
                <hr />
                <p>Here at WeblerLearn, we offer the best courses:</p>

                {/* Responsive grid below, rowHome */}
                <div className="rowHome">
                    <div className="col-7">
                        <h1>C++</h1>
                        <p>Course: Learn C++ programming language</p>
                        <p>Instructor: Paul Caron</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>Java</h1>
                        <p>Course: Learn Java programming language</p>
                        <p>Instructor: Cosmin T</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>HTML + CSS</h1>
                        <p>Course: Learn HTML and CSS and basics of web dev</p>
                        <p>Instructor: TejaDon</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>React</h1>
                        <p>Course: Learn more about React basics and applications</p>
                        <p>Instructor: Solomoni Railoa</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>Flutter</h1>
                        <p>Course: Master the art of cross platform app development with Flutter</p>
                        <p>Instructor: Cosmin T</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>C#</h1>
                        <p>Course: Learn C# programing and make Windows Apps easily.</p>
                        <p>Instructor: Vachila64</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>Python</h1>
                        <p>Course: Learn Python programming language</p>
                        <p>Instructor: Adrit Khanra</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>Kotlin</h1>
                        <p>Course: Learn Kotlin and make Android apps</p>
                        <p>Instructor: Prashanth Kumar</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>C</h1>
                        <p>Course: Learn the C programming language</p>
                        <p>Instructor: Paul Caron</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                    <div className="col-7">
                        <h1>Game Dev</h1>
                        <p>Course: Learn Unity and Unreal Engine 5</p>
                        <p>Instructor: David Dolejsi</p>
                        <hr></hr>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, "to add a short description of this product here" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat</p>
                        <Button variant="primary">Take this course</Button><span style={{float:"right", fontSize:"12px"}}> 96 likes - 69 comments - 403 views</span>
                    </div>
                </div>
            </main>
        </>
    );
}

export default Learn;