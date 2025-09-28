import Loader from "../components/Loader";

const LoadingPage = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Loader />
    </div>
  );
};

export default LoadingPage;