import MenuNavBar from "../partials/MenuNavBar";
import Footer from "../partials/Footer";
import { Button } from "react-bootstrap";

function Home() {

    return (
        <>
            {/* Header */}
            <MenuNavBar pageName={"Home"}/>
            <div className="bannerImage">{/* collage.jpg is set as blurred background image*/}</div>
            <div className="bannerImagePropsFore">
                <div className="frontWords">
                    <img src="../resources/images/logotransparent.png" className="bigLogoFront"/>
                    <p className="bannerText bTbigger">Software Engineering</p>
                    <hr></hr>
                    <p className="bannerText bTsmaller">- Building the future, one code at a time</p>
                </div>
            </div>

            {/* Main */}
            <main className="mainAfterBanner">
                <a href="https://github.com/WeblerGroup" target="blank" className="bannerGitHubAdv" ><img className="gitlogo" src="../resources/images/githubmark.png" width="33px"/> GitHub | Check out our project source codes</a>
                <div className="pageNameBannerTop" style={{paddingTop:"0px", marginTop:"0px", height:"fit-content"}}>
                    <h1 style={{paddingTop:"0px", marginTop:"0px"}} >Home</h1>
                </div>
                <hr></hr>
                <h4>Welcome to Webler!</h4>
                <p>Hey! We're Webler, a group of independent developers around the world. We create applications of any kind, but mostly for the web. All our products are meant to be either useful or fun, but most importantly free! Our goal is to make accessible, innovative software, that's our contribution to a better future. We hope that some of our projects might be helpful and enjoyable for you :D Here's an overview of our projects and news:</p>

                <div className="rowHome">
                    <div className="col-6">
                        <a className="linksNoDecor" href="/code"><h1>Products</h1></a>
                        <p>The developers of Webler have published a lot of apps and games for everyone to use and play with, absolutely for free.</p>
                        <div style={{width:"100%", alignContent:"center", alignItems:"center", justifyContent:"center", justifyItems:"center", display:"flex"}}>
                        <img src="../resources/images/iStock_000063515869_Large-1024x576.jpg" style={{width:"60%", alignSelf:"center",borderRadius:"10px"}}></img>
                        </div>
                            
                        <div style={{marginTop:"10px", width:"100%", alignItems:"center", display:"flex", justifyContent:"center"}}>
                            <Button href="/code" style={{marginLeft:"5px", marginRight:"5px"}}>Apps</Button> 
                            <Button href="/code" style={{marginLeft:"5px", marginRight:"5px"}}>Games</Button> 
                            <Button href="/code" style={{marginLeft:"5px", marginRight:"5px"}}>Other</Button>    
                        </div>
                        
                    </div>
                    <div className="col-6">
                        <a className="linksNoDecor" href="/news"><h1>News</h1></a>
                        <p>Check out the latest news in Webler, and be the first to know about every groundbreaking event in the world of modern computing science.</p>
                        <div style={{width:"100%", alignContent:"center", alignItems:"center", justifyContent:"center", justifyItems:"center", display:"flex"}}>
                        <img src="../resources/images/MKF5296-1024x683.jpg" style={{width:"50%", alignSelf:"center",borderRadius:"10px"}}></img>
                        </div>
                            
                        <div style={{marginTop:"10px", width:"100%", alignItems:"center", display:"flex", justifyContent:"center"}}>
                            <Button href="/news" style={{marginLeft:"5px", marginRight:"5px"}}>Read our latest news</Button>    
                        </div>
                    </div>
                    <div className="col-6">
                        <h1>Community</h1>
                        <p>Join our social network for memes, trends, media, chat, etc. All the fun you can have in our all new social network.</p>
                        <Button href="/social">Find friends</Button> <br/> <br/>
                        <p>Seek help and help others in our Discussion Forum. It's better than StackOverFlow.</p>
                        <Button href="/discuss">Find discussions</Button>
                    </div>
                    <div className="col-6">
                    <a className="linksNoDecor" href="/learn"><h1>Learn</h1></a>
                        <p>Educate yourself and land your first programming oriented job with our Courses.</p>
                        <Button href="/learn">Enroll now</Button><br/><br/>
                        <p>Should you ever need extra information or help in your courses, you can also use the Dicsussion Forum</p>
                        <Button href="/discuss">View discussions</Button>
                    </div>
                </div>
            </main>
             {/* Footer */}
             <Footer />
        </>
    );
}

export default Home;