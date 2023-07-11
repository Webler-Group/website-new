import MenuNavBar from "../../partials/MenuNavBar";
import Footer from "../../partials/Footer";
import PageTitle from "../../partials/PageTitle";

function News() {
    PageTitle("NewsList[index] | Webler")
    return (
        <>
            {/* Header */}
            <MenuNavBar pageName={"News Title"} />

            {/* Main */}
            <main>
                <div className="pageNameBannerTop">
                    <h1>News Item</h1>
                </div>
                <hr />
                
                <h6>News item retrieved from News Database, preferably stored in Firebase, also created by Webler logged in users with News Editing Priviledges.</h6>
                
                <p>Title: ______</p>
                <p>Author: _____</p>
                <p>Date: dd/mm/yyyy hh/mm/ss</p>
                <p>News text here ..... blah blah blah yita yata yipee kiyay </p>
                
            </main>

            {/* Footer*/}
            <Footer />
        </>
    );
}

export default News;