import { Link } from 'react-router-dom';

function Footer() {
    return (
        <footer className="bg-black text-white py-6 mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex space-x-6 mb-4 md:mb-0">
                        <Link to="/" className="hover:text-blue-200">Home</Link>
                        <Link to="/Contact" className="hover:text-blue-200">Contacts</Link>
                        <Link to="/Terms-of-use" className="hover:text-blue-200">Terms of Use</Link>
                        <Link to="/Privacy-policy" className="hover:text-blue-200">Privacy Policy</Link>
                    </div>
                    <div className="text-center md:text-right">
                        Made with <span className="text-xl">❤️</span> by <span className="font-semibold">Webler Codes</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer
