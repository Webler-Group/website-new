import Loader from "../components/Loader"

const LoadingPage = () => {
    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
            <Loader />
        </div>
    )
}

export default LoadingPage;