
import { Button } from "react-bootstrap";
import { Link } from "react-router-dom";

function Home() {

    return (
        <>
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
                <Link to="https://github.com/WeblerGroup" target="blank" className="bannerGitHubAdv" ><img className="gitlogo" src="../resources/images/githubmark.png" width="33px"/> GitHub | Check out our project source codes</Link>
                <div className="pageNameBannerTop" style={{paddingTop:"0px", marginTop:"0px", height:"fit-content"}}>
                    <h1 style={{paddingTop:"0px", marginTop:"0px"}} >Home</h1>
                </div>
                <hr></hr>
                <h4>Welcome to Webler!</h4>
                <p>Hey! We're Webler, a group of independent developers around the world. We create applications of any kind, but mostly for the web. All our products are meant to be either useful or fun, but most importantly free! Our goal is to make accessible, innovative software, that's our contribution to a better future. We hope that some of our projects might be helpful and enjoyable for you :D Here's an overview of our projects and news:</p>

                <div className="rowHome">
                    <div className="col-6">
                        <Link className="linksNoDecor" to="/code"><h1>Products</h1></Link>
                        <p>The developers of Webler have published a lot of apps and games for everyone to use and play with, absolutely for free.</p>
                        <div style={{width:"100%", alignContent:"center", alignItems:"center", justifyContent:"center", justifyItems:"center", display:"flex"}}>
                        <img src="../resources/images/iStock_000063515869_Large-1024x576.jpg" style={{width:"60%", alignSelf:"center",borderRadius:"10px"}}></img>
                        </div>
                            
                        <div style={{marginTop:"10px", width:"100%", alignItems:"center", display:"flex", justifyContent:"center"}}>
                            <Link style={{textDecoration: "none"}}  to="/code"><Button style={{marginLeft:"5px", marginRight:"5px"}}>Apps</Button> </Link>
                            <Link style={{textDecoration: "none"}}  to="/code"><Button style={{marginLeft:"5px", marginRight:"5px"}}>Games</Button></Link>
                            <Link style={{textDecoration: "none"}}  to="/code"><Button style={{marginLeft:"5px", marginRight:"5px"}}>Other</Button></Link>    
                        </div>
                        
                    </div>
                    <div className="col-6">
                        <Link style={{textDecoration: "none"}}  to="/news"><h1 style={{textDecoration:"none",color:"var(--fontColor)"}}>News</h1></Link>
                        <p>Check out the latest news in Webler, and be the first to know about every groundbreaking event in the world of modern computing science.</p>
                        <div style={{width:"100%", alignContent:"center", alignItems:"center", justifyContent:"center", justifyItems:"center", display:"flex"}}>
                        <img src="../resources/images/MKF5296-1024x683.jpg" style={{width:"50%", alignSelf:"center",borderRadius:"10px"}}></img>
                        </div>
                            
                        <div style={{marginTop:"10px", width:"100%", alignItems:"center", display:"flex", justifyContent:"center"}}>
                            <Link style={{textDecoration: "none"}}  to="/news"><Button style={{marginLeft:"5px", marginRight:"5px"}}>Read our latest news</Button></Link>
                        </div>
                    </div>
                    <div className="col-6">
                        <h1>Community</h1>
                        <p>Join our social network for memes, trends, media, chat, etc. All the fun you can have in our all new social network.</p>
                        <Link style={{textDecoration: "none"}}  to="/social"><Button href="/social">Find friends</Button></Link> <br/> <br/>
                        <p>Seek help and help others in our Discussion Forum. It's better than StackOverFlow.</p>
                        <Link style={{textDecoration: "none"}}  to="/discuss"><Button href="/discuss">Find discussions</Button></Link>
                    </div>
                    <div className="col-6">
                    <Link style={{textDecoration: "none"}}  to="/learn"><h1 style={{textDecoration:"none",color:"var(--fontColor)"}}>Learn</h1></Link>
                        <p>Educate yourself and land your first programming oriented job with our Courses.</p>
                        <Link style={{textDecoration: "none"}}  to="/learn"><Button>Enroll now</Button></Link><br/><br/>
                        <p>Should you ever need extra information or help in your courses, you can also use the Dicsussion Forum</p>
                        <Link style={{textDecoration: "none"}}  to="/discuss"><Button>View discussions</Button></Link>
                    </div>
                </div>
            </main>
        </>
    );
}

export default Home;