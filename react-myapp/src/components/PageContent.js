import style from "./PageContent.css";

const React = require("react");
const axios = require("axios");

const {BrowserRouter,Route,Link} = require("react-router-dom");

let curNewsCount = 0; //当前新闻总数
let curScrollTop = 0; //滚动条当前位置
let stateCopy = null; //PageContent的状态拷贝
let hasNoNews = false; //数据库中有无可加载新鲜内容
let reqNewsSleepTime_TID = null; //暂停请求的时间标识符
let reqNewsSleepTime = 10000; //暂停请求的时间长度（ms)


const rootAddr = "http://localhost:8080";//http://localhost:8080


export class PageContent extends React.Component{
    constructor(option){
        super();
        this.state = stateCopy || {display:false, pages:[]};

        this.scrollToBottomDetector = async (e)=>{
            var max = document.scrollingElement.scrollHeight;
            var pos = document.scrollingElement.scrollTop;

            var diff = Math.floor(max - pos);
            var docRootEl = Math.floor(window.innerHeight);
       
            if(diff <= docRootEl+20){
                document.removeEventListener("scroll",this.scrollToBottomDetector);
                await this.getPageData(curNewsCount,e);
                document.addEventListener("scroll",this.scrollToBottomDetector);
            }
            curScrollTop = pos;
        };
    }

    getPageData( $curNewsCount, scrollEvent ){
        if(!hasNoNews){//存在可更新内容
            this.setState({...this.state, display:true});
            return axios.post(rootAddr+"/news/page/" + $curNewsCount).then((res)=>{
                    this.setState({...this.state, display:false});

                    if(hasNoNews = res.data.length==0) return;

                    curNewsCount += res.data.length;
                    stateCopy = this.state;
                    
                    res.data.map(v=>this.state.pages.push(v));
                    this.setState(this.state);
                })
            .catch((err)=>{
                console.log(err);
            })
        }else{//不存在可更新内容
            //console.log("sleeps for 10seconds.");
            clearTimeout(reqNewsSleepTime_TID);
            reqNewsSleepTime_TID = setTimeout(()=>{
                hasNoNews = false;
            },reqNewsSleepTime);
        }
    }

    async componentDidMount(){
        await this.getPageData(curNewsCount);
        document.addEventListener("scroll",this.scrollToBottomDetector);
        window.scrollTo({left:0, top:curScrollTop});
    }

    componentWillUnmount(){
        curScrollTop = document.scrollingElement.scrollTop;
        stateCopy = this.state;
        document.removeEventListener("scroll",this.scrollToBottomDetector);
    }

    gotoTop(event){
        window.scrollTo({
            left:0,top:0,
            behavior:'smooth'
        })
    }

    render(){
        let pages = this.state.pages || [];
        return <div>
                <h1 style={{textDecoration:'line-through',margin:0}}>Sparrow</h1>
                {
                    pages.map((page,ix)=>{
                        return <div className="page" key={ix}>
                                <div className="newsTitle">{page.title}</div>
                                <hr style={{border:"1px solid black"}}/>
                                <div className="newsSource">{page.source}</div>
                                <div className="newsContent" dangerouslySetInnerHTML={{__html:page.content.replace(/<br>/gi,'').slice(0,200)+"...."}}></div>
                                <div className="readMore"><Link to={"/news/"+page._id}>READ MORE</Link></div>
                                <div className="newsTimestamp">
                                    <span >{page.timestamp.split("(GMT")[0]}</span>
                                    <span className="repliesCount">{ page.repliesCount + (page.repliesCount>1 ? " Replies" : " Reply")}</span>
                                </div> 
                        </div>
                    })
                }
                <div className="gotoTop" onClick={ (e)=>{this.gotoTop(e)} }>Top</div>  
                {
                    this.state.display && <div className="loading">Loading...</div>
                }
            </div>
    }
}