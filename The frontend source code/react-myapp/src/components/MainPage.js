const React = require("react");
const style = require("./MainPage.css");

const {BrowserRouter,Route,Link} = require("react-router-dom");
const {PageContent} = require("./PageContent");
const {NewsContent} = require("./NewsContent");
const linkPath = "/";// /

export class MainPage extends React.Component{
    render(){
        return <BrowserRouter style={{position:'absolute',left:'0px',top:'0px'}}>
            <div>
                <Route exact path={linkPath} component={PageContent}></Route>
                <Route path="/news/:newsid" component={NewsContent} className="newsContent"/>
            </div>
        </BrowserRouter>
    }
}

//<div dangerouslySetInnerHTML={{__html:v.content.slice(0,200)+" ....继续阅读"}}></div>
//<Route path="/page/:pageid" component={PageContent} className="pageContent"/>