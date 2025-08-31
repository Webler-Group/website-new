import PageTitle from "../layouts/PageTitle";
import RegisterForm from "../features/auth/components/RegisterForm";
import Register from "../features/auth/pages/Register";

function Home() {

  PageTitle("Webler - Home", false);

  return (
    <>
    <section className="relative h-screen bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: "url('../resources/images/collageBlurred.jpg')" }}>
      <div className="relative text-center text-white z-10">
        <img className="wb-banner__logo__img" src="../resources/images/logotransparent.png" alt="Webler logo" style={{ width: "calc(100vw * 0.7)", aspectRatio: 2 }} />
        <p className="mt-4 text-lg md:text-2xl">Learn, Discuss, and Code Together</p>
      </div>
    </section>

    <section className="h-screen flex items-center justify-center bg-gray-100 px-8">
      <div className="max-w-4xl text-center">
        <svg className="w-16 h-16 mx-auto mb-6 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V4m0 12v4"/>
        </svg>
        <h2 className="text-4xl font-bold mb-4">About Us</h2>
        <p className="text-lg">
          We're a global team of independent developers passionate about building high-quality, 
          accessible software. Our mission is to create useful and fun tools — always free and open to everyone. Whether you're a beginner or a pro, we aim to support your learning and creativity with practical, innovative applications.
        </p>
      </div>
    </section>

    <section className="h-screen bg-white flex flex-col items-center justify-center px-6">
      <h2 className="text-4xl font-bold mb-12">What We Provide</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl">
        
        <div className="bg-gray-100 p-6 rounded-2xl shadow hover:shadow-lg transition">
          <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 20l9-5-9-5-9 5 9 5z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 12l9-5-9-5-9 5 9 5z"/>
          </svg>
          <h3 className="text-xl font-semibold mb-2">Courses</h3>
          <p>Free structured coding courses to build skills step by step.</p>
          <div className="flex space-x-4">    
            <img src="../resources/icons/cplusplus-original.svg" alt="C++" className="w-8 h-8" />
            <img src="../resources/icons/python-original.svg" alt="Python" className="w-8 h-8" />
            <img src="../resources/icons/lua-original.svg" alt="Android" className="w-8 h-8" />
            <img src="../resources/icons/javascript-original.svg" alt="JavaScript" className="w-8 h-8" />
          </div>  
        </div>

        <div className="bg-gray-100 p-6 rounded-2xl shadow hover:shadow-lg transition">
          <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M3 12h18M3 17h18"/>
          </svg>
          <h3 className="text-xl font-semibold mb-2">Code Playground</h3>
          <p>Experiment with code in real-time and share with others.</p>
            <div className="flex space-x-4 items-center">    
              <img src="../resources/icons/kotlin-original.svg" alt="Kotlin" className="w-8 h-8" />
              <img src="../resources/icons/csharp-original.svg" alt="Csharp" className="w-8 h-8" />
              <img src="../resources/icons/c-original.svg" alt="C" className="w-8 h-8" />
              <img src="../resources/icons/java-original.svg" alt="Java" className="w-8 h-8" />
            </div>  
        </div>

        <div className="bg-gray-100 p-6 rounded-2xl shadow hover:shadow-lg transition">
          <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8h9M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5V4z"/>
          </svg>
          <h3 className="text-xl font-semibold mb-2">Discussion</h3>
          <p>Engage in meaningful conversations about coding and technology.</p>
          <div className="flex space-x-3 items-center">
            <img src="../resources/icons/android-original.svg" alt="Android" className="w-8 h-8" />
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" stroke-width="2" 
                viewBox="0 0 24 24">
              <text x="3" y="18" font-size="16" font-family="serif" fill="currentColor">π</text>
            </svg>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" stroke-width="2" 
                viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16m0 0l-4-4m4 4l-4 4"/>
            </svg>
            <svg className="w-8 h-8 text-lime-500" fill="none" stroke="currentColor" stroke-width="2" 
                viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" 
                    d="M7 8h10M7 12h4m9 8l-5-5H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v12z"/>
            </svg>
          </div>
        </div>

        <div className="bg-gray-100 p-6 rounded-2xl shadow hover:shadow-lg transition">
          <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
          <h3 className="text-xl font-semibold mb-2">Blogs</h3>
          <p>Stay updated with coding trends, tutorials, and articles.</p>
          <div className="flex space-x-4 items-center">    
              <img src="../resources/icons/kotlin-original.svg" alt="Kotlin" className="w-8 h-8" />
              <img src="../resources/icons/javascript-original.svg" alt="Javascript" className="w-8 h-8" />
              <img src="../resources/icons/java-original.svg" alt="Java" className="w-8 h-8" />
            </div>
        </div>
      </div>
    </section>

    <section className="h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <h2 className="text-4xl font-bold mb-12">What Our Users Say</h2>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl">
        
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <svg className="w-10 h-10 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 10c0 3.866-3.582 7-8 7s-8-3.134-8-7 3.582-7 8-7 8 3.134 8 7z"/>
          </svg>
          <p>"Webler changed the way I learn. The courses and playground are fantastic!"</p>
          <h4 className="mt-4 font-semibold">— Witcher.</h4>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <svg className="w-10 h-10 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 10c0 3.866-3.582 7-8 7s-8-3.134-8-7 3.582-7 8-7 8 3.134 8 7z"/>
          </svg>
          <p>"I love the discussions. Peers are always there to help out!"</p>
          <h4 className="mt-4 font-semibold">— RuntimeTerror.</h4>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <svg className="w-10 h-10 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 10c0 3.866-3.582 7-8 7s-8-3.134-8-7 3.582-7 8-7 8 3.134 8 7z"/>
          </svg>
          <p>"A great free resource for learning coding with peers. Highly recommend!"</p>
          <h4 className="mt-4 font-semibold">— DonDejvo.</h4>
        </div>
      </div>
    </section>

    <Register />
    </>
  );
}

export default Home;
