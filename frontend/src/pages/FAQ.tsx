import { Container } from "react-bootstrap";
import PageTitle from "../layouts/PageTitle";

const FAQ = () => {
    PageTitle("Frequently Asked Questions", false);

    return (
        <div className="bg-light py-4" style={{ minHeight: "100vh" }}>
            <Container>
                <div className="bg-white rounded p-4 shadow">
                    <h2 className="mb-4">Frequently Asked Questions</h2>

                    <ul>
                        <li><a href="#email-verification">Do I need to verify my email?</a></li>
                        <li><a href="#markdown-support">What content is supported in Feed and QA?</a></li>
                        <li><a href="#allowed-links">Which image and link URLs are allowed?</a></li>
                        <li><a href="#user-mentions">How do I mention other users in discussions?</a></li>
                    </ul>

                    <hr />

                    <div id="email-verification" className="mb-4">
                        <h5>Do I need to verify my email?</h5>
                        <p>
                            Yes. Email verification is required to post questions in the QA forum, create feed
                            posts, leave comments, or upvote any content. This helps maintain a trustworthy and spam-free community.
                        </p>
                    </div>

                    <div id="markdown-support" className="mb-4">
                        <h5>What content is supported in Feed and QA?</h5>
                        <p>
                            Feed posts and QA discussions support <strong>GitHub-flavored Markdown</strong>.
                            This allows you to format your text with headers, code blocks, lists, links, images, and more —
                            making technical discussions clean and readable.
                        </p>
                    </div>

                    <div id="allowed-links" className="mb-4">
                        <h5>Which image and link URLs are allowed?</h5>
                        <p>
                            For safety and spam prevention, only links and images from the following domains are allowed in posts:
                        </p>
                        <ul>
                            <li><code>imgur.com</code> or <code>i.imgur.com</code></li>
                            <li><code>ibb.co</code> or <code>i.ibb.co</code></li>
                            <li><code>postimg.cc</code> or <code>i.postimg.cc</code></li>
                            <li><code>github.com</code></li>
                            <li><code>*.github.io</code> (GitHub Pages)</li>
                            <li><code>raw.githubusercontent.com</code> (raw files)</li>
                            <li><code>dropbox.com</code> or <code>dl.dropboxusercontent.com</code></li>
                            <li><code>weblercodes.com</code></li>
                        </ul>
                        <p>
                            The image URL must be a <strong>direct link to the file</strong> (e.g. ending with <code>.jpg</code>, <code>.png</code>, etc.), not a preview or page link.
                        </p>
                        <p>
                            Any other external URLs will be stripped out or not rendered.
                        </p>
                    </div>


                    <div id="user-mentions" className="mb-4">
                        <h5>How do I mention other users in discussions?</h5>
                        <p>
                            You can mention users in QA discussions and comments using the following syntax:
                        </p>
                        <pre className="bg-light p-2 rounded">
                            [user id="user_id"]username[/user]
                        </pre>
                        <p>
                            Alternatively, just type <strong>@</strong> to trigger the user search modal and
                            select the person you want to mention. Once selected, it will auto-fill the correct mention syntax.
                        </p>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default FAQ;
