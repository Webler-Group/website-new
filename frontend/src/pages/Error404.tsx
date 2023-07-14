import PageTitle from "../partials/PageTitle";

function Error404() {
    PageTitle("Page not found")
    return (
        <>
            {/* Main */}
            <main>
                <h1>Oops!</h1>
                <h2>The page you are looking is not found.</h2>
                <hr />
                <p>Error code: 404</p>
            </main>
        </>
    );
}

export default Error404;