import { Container } from "react-bootstrap"
import { Link } from "react-router-dom"
import { languagesInfo } from "../../../data/compilerLanguages"

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
                            {
                                Object.entries(languagesInfo).map((entry, i) => {
                                    return (
                                        <div key={i} className="wb-language-types__item">
                                            <h3 style={{ borderColor: entry[1].color, color: entry[1].color }} className="wb-language-types__language-button">
                                                <Link to={"/Compiler-Playground/" + entry[0]}>{entry[1].displayName}</Link>
                                            </h3>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </Container>
            </div>
        </div>
    )
}

export default PlaygroundMenu
