import PageTitle from "../layouts/PageTitle";

function AboutUs() {
    PageTitle("About Us | Webler")    
    return (
        <>
            {/* Main */}
            <main>
                <div className="pageNameBannerTop">
                    <h1>About Us</h1>
                </div>
                <hr />
                <p>Explore our origins and true traditions, as we dive deeper into the history of Webler, the core element of our uniqueness that makes us the most successful Software Engineering Company in the world.</p>
            </main>
        </>
    );
}

export default AboutUs;