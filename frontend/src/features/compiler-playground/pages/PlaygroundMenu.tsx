import { Container } from "react-bootstrap"
import { Link } from "react-router-dom"

const PlaygroundMenu = () => {
    return (
        <div className="wb-playground-wrapper">
            <div className="bg-dark text-light">
                <Container>
                    <div className="text-center py-4 position-relative wb-playground-wrapper">
                        <h1 className="mt-4">Free online code editor, compiler and playground</h1>
                        <p className="mt-4">Our free online code editor supports some programming languages. Pick a language to get started!</p>
                        <h2 className="mt-4">Choose your programming language</h2>
                        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3 mt-2">
                            <div className="wb-language-types__item">
                                <h3 style={{ borderColor: "rgb(221, 72, 36)", color: "rgba(221, 72, 36, 0.565)" }} className="wb-language-types__language-button">
                                    <Link to="/Compiler-Playground/web">Web Compiler</Link>
                                </h3>
                            </div>
                            <div className="wb-language-types__item">
                                <h3 style={{ borderColor: "rgb(49, 124, 226)", color: "rgba(49, 124, 226, 0.565)" }} className="wb-language-types__language-button">
                                    <Link to="/Compiler-Playground/c">C</Link>
                                </h3>
                            </div>
                            <div className="wb-language-types__item">
                                <h3 style={{ borderColor: "rgb(49, 124, 226)", color: "rgba(49, 124, 226, 0.565)" }} className="wb-language-types__language-button">
                                    <Link to="/Compiler-Playground/cpp">C++</Link>
                                </h3>
                            </div>
                            <div className="wb-language-types__item">
                                <h3 style={{ borderColor: "rgb(49, 124, 226)", color: "rgba(49, 124, 226, 0.565)" }} className="wb-language-types__language-button">
                                    <Link to="/Compiler-Playground/python">Python</Link>
                                </h3>
                            </div>
                            <div className="wb-language-types__item">
                                <h3 style={{ borderColor: "rgb(75, 137, 38)", color: "rgba(75, 137, 38, 0.565)" }} className="wb-language-types__language-button">
                                    <Link to="/Compiler-Playground/nodejs">NodeJS</Link>
                                </h3>
                            </div>
                            <div className="wb-language-types__item">
                                <h3 style={{ borderColor: "rgb(198, 42, 74)", color: "rgba(198, 42, 74, 0.565)"}} className="wb-language-types__language-button">
                                    <Link to="/Compiler-Playground/ruby">Ruby</Link>
                                </h3>
                            </div>
                            <div className="wb-language-types__item">
                                <h3 style={{borderColor: "rgb(79, 45, 168)", color: "rgba(79, 45, 168, 0.565)"}} className="wb-language-types__language-button">
                                    <Link to="/Compiler-Playground/lua">Lua</Link>
                                </h3>
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        </div>
    )
}

export default PlaygroundMenu
