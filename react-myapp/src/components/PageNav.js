import style from "./PageNav.css";
const React = require("react");
const axios = require("axios");
const {Link} = require("react-router-dom");

export class PageNav extends React.Component{
    constructor(){
        super();
        this.state = {};
    }
    componentWillMount(){
        axios.post("http://localhost:8080/pageCount")
            .then((res)=>{
                let pageCount = res.data;
                this.setState({
                    ...this.state,
                    pageCount: parseInt(res.data)
                })
            })
            .catch((err)=>{
                console.log(err);
            })
    }
    render(){
        return <div className="pageNav">
            {
                this.state.pageCount && ((pageCount)=>{
                    let nav = [];
                    for(let i=1;i<=pageCount;i++){
                        nav.push(<Link to={"/page/"+i} className="link" key={i}>{i}</Link>);
                    }
                    return nav;
                })(this.state.pageCount)
            }
        </div>
    }
}