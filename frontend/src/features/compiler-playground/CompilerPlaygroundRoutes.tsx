import { Route, Routes } from "react-router-dom";
import Layout from "../../layouts/Layout";
import { compilerLanguages, languagesInfo } from "../../data/compilerLanguages";
import Header from "../../layouts/Header";
import PlaygroundMenuPage from "./pages/PlaygroundMenuPage";
import PlaygroundEditorPage from "./pages/PlaygroundEditorPage";
import Footer from "../../layouts/Footer";
import "./compiler-playground.css"

const CompilerPlaygroundRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
                <Route index element={<PlaygroundMenuPage />} />
            </Route>
            {
                Object.keys(languagesInfo).map((lang, i) => {
                    return (<Route key={i} path={lang} element={<PlaygroundEditorPage language={lang as compilerLanguages} />} />);
                })
            }
            <Route path=":codeId" element={<PlaygroundEditorPage language={null} />} />
        </Routes>
    )
}

export default CompilerPlaygroundRoutes;