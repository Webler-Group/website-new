import MenuNavBar from "../../partials/MenuNavBar";
import Footer from "../../partials/Footer";
import PageTitle from "../../partials/PageTitle";
import { Button } from "react-bootstrap";

function News() {
    PageTitle("News (Edit) | Webler")
    return (
        <>
            {/* Header */}
            <MenuNavBar pageName={"News Editor"} />

            {/* Main */}
            <main>
                <div className="pageNameBannerTop">
                    <h1>News Editor</h1>
                </div>
                <hr />
                <h6>Use the tool below to make changes to your news:</h6>
                <form>
                    <input placeholder="Title of your news"></input>
                    <textarea placeholder="Type your news story here..."></textarea>
                    <Button>Save news</Button><Button>Cancel</Button>
                </form>
            </main>

            {/* Footer*/}
            <Footer />
        </>
    );
}

export default News;