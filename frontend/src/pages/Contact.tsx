
import PageTitle from "../layouts/PageTitle";

const Contact = () => {
  PageTitle("Contact", false);
  return (
    <>
    <section className="bg-gray-100 py-16" id="contact">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-10">Contact Us</h2>

        <div className="grid md:grid-cols-2 gap-10">
          
          <div className="bg-white shadow-lg rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-6">Send us a message</h3>
            <form action="#" method="POST" className="space-y-5">
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="name">Name</label>
                <input type="text" id="name" name="name" placeholder="Your name"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none" />
              </div>

              <div>
                <label className="block text-gray-700 mb-2" htmlFor="email">Email</label>
                <input type="email" id="email" name="email" placeholder="you@example.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none" />
              </div>

              <div>
                <label className="block text-gray-700 mb-2" htmlFor="message">Message</label>
                <textarea id="message" name="message" rows={5} placeholder="Write your message..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none"></textarea>
              </div>

              <button type="submit"
                className="w-full bg-red-500 text-white py-2 px-6 rounded-lg font-semibold hover:bg-red-600 transition">
                Send Message
              </button>
            </form>
          </div>

          <div className="flex flex-col items-center justify-center space-y-6">
            <h3 className="text-xl font-semibold">Connect with us</h3>
            <div className="flex space-x-6">
              
              <a href="#" className="text-gray-600 hover:text-blue-500" aria-label="X">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2H21l-6.44 7.35L22 22h-6.97l-4.36-6.21L5.67 22H2l6.84-7.81L2 2h7.03l3.77 5.54L18.24 2z"/>
                </svg>
              </a>

              <a href="#" className="text-gray-600 hover:text-pink-500" aria-label="Instagram">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 
                    2.243 5 5 5h10c2.757 0 5-2.243 
                    5-5V7c0-2.757-2.243-5-5-5H7zm10 
                    2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 
                    3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10zm-5 
                    3a5 5 0 1 0 0 10 5 5 0 0 0 
                    0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 
                    0-6zm4.5-2a1.5 1.5 0 1 0 0 3 
                    1.5 1.5 0 0 0 0-3z"/>
                </svg>
              </a>

              <a href="#" className="text-gray-600 hover:text-gray-900" aria-label="GitHub">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.58 2 
                    12.26c0 4.52 2.87 8.36 6.84 
                    9.72.5.1.68-.22.68-.49 
                    0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.46-1.19-1.12-1.51-1.12-1.51-.91-.64.07-.63.07-.63 
                    1 .07 1.52 1.05 1.52 1.05.9 
                    1.57 2.36 1.12 2.94.85.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.15-4.56-5.11 
                    0-1.13.39-2.05 1.03-2.77-.1-.26-.45-1.3.1-2.7 
                    0 0 .84-.27 2.75 1.05A9.4 9.4 0 0 1 12 6.8a9.4 9.4 
                    0 0 1 2.5.34c1.9-1.32 2.75-1.05 
                    2.75-1.05.55 1.4.2 2.44.1 
                    2.7.64.72 1.03 1.64 1.03 
                    2.77 0 3.97-2.34 4.85-4.57 
                    5.11.36.32.68.94.68 
                    1.91 0 1.38-.01 2.5-.01 
                    2.83 0 .27.18.6.69.49A10.02 
                    10.02 0 0 0 22 12.26C22 6.58 
                    17.52 2 12 2z"/>
                </svg>
              </a>

              <a href="#" className="text-gray-600 hover:text-red-600" aria-label="YouTube">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.5 6.2a2.99 2.99 0 0 0-2.1-2.12C19.4 
                    3.5 12 3.5 12 3.5s-7.4 0-9.4.58A2.99 2.99 
                    0 0 0 .5 6.2 31.53 31.53 0 0 0 0 12c0 
                    1.94.2 3.87.5 5.8a2.99 2.99 0 0 0 
                    2.1 2.12C4.6 20.5 12 20.5 12 
                    20.5s7.4 0 9.4-.58a2.99 2.99 0 0 0 
                    2.1-2.12c.3-1.93.5-3.86.5-5.8 
                    0-1.94-.2-3.87-.5-5.8zM9.75 
                    15.02V8.98l6.25 3.02-6.25 
                    3.02z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
};

export default Contact;
