import MenuNavBar from "../partials/MenuNavBar";
import Footer from "../partials/Footer";
import PageTitle from "../partials/PageTitle";

function AboutUs() {
    PageTitle("About Us | Webler")    
    return (
        <>
            {/* Header */}
            <MenuNavBar pageName={"AboutUs"} />

            {/* Main */}
            <main>
                <div className="pageNameBannerTop">
                    <h1>About Us</h1>
                </div>
                <hr />
                <p>Explore our origins and true traditions, as we dive deeper into the history of Webler, the core element of our uniqueness that makes us the most successful Software Engineering Company in the world.</p>
            </main>

            {/* Footer */}
            <Footer />
        </>
    );
}

export default AboutUs;