import style from "./NewsContent.css";
const React = require("react");
const axios = require("axios");
const {Link} = require("react-router-dom");

const rootAddr = "http://localhost:8080";//
const linkPath = "/"// /

export class NewsContent extends React.Component{
    constructor(option){
        super();

        const initSortKey = localStorage.getItem("orderBy")||"latest";
        this.ORDERBY = { 
            latest: {_id:-1},
            earliest: {_id:1},
            mostreplied: {replyCount:-1},
            mostliked: {likeCount:-1},
            mosthated: {hateCount:-1}
        }

        this.newsid = option.match.params.newsid;

        this.state = {
            reviewHasUnfolded:false,
            replyArea:{ activeElem:[] },
            display:false,
            sortButton:{ [initSortKey]:true },
            sortValue: this.ORDERBY[initSortKey],
        };

    }

    getNewsData(newsid){
        axios.post(rootAddr+"/news/"+newsid)
            .then((res)=>{
                this.setState({
                    ...this.state,
                    news: res.data
                });
            })
            .catch((err)=>{
                console.log(err);
            })
    }

    componentDidMount(){
        this.getNewsData(this.newsid);
    }


    updateReviewByOrder(e,sortKey="latest"){
        this.state.sortValue = this.ORDERBY[sortKey];
        this.state.sortButton = { [sortKey]: true };
        localStorage.setItem("orderBy",sortKey);

        this.checkReview(e);
    }

    checkReview(e, sortValue=this.state.sortValue){
        ///news/getReview/:newsid
        if(e) {
            e.preventDefault();
            e.target.disabled=true;
            if(e.target.parentNode.className == "orderBy"){
                [].map.call(e.target.parentNode.children,v=>v.disabled=true);
            }
            e.persist();
        }


        this.setState({...this.state, display:true});

        axios.post(rootAddr+"/news/getReview/"+this.newsid,{orderBy:sortValue})
            .then((res)=>{
                if(e){
                    e.target.disabled = false;
                    if(e.target.parentNode.className == "orderBy"){
                        [].map.call(e.target.parentNode.children,v=>v.disabled=false);
                    }
                }
                //console.log("res.data:",res.data);
                this.setState({...this.state, reviewHasUnfolded:true, reviews:res.data, display:false });
            })
            .catch((err)=>{
                console.log(err);
            });
    }

    changeHandle(e){
        this.state[e.target.name] = e.target.value;
    }

    checkForm(name='',content=''){
        let nameRegex = /.{1,}/gi;
        let contentRegex = /.{8,}/i;

        
        if(!nameRegex.test(name.trim())){
            alert("the name can not be empty.");
            return false;
        }
        if(!contentRegex.test(content.trim())){
            alert("the comments must be at least 8 characters.");
            return false;
        }

        return true;
    }

    submitReview(e){
        e.preventDefault();
        e.target.disabled=true;
        e.persist();

        if(!this.checkForm(this.state.yourname,this.state.yourreview)){
            e.target.disabled=false;
            return;
        }

        axios.post(rootAddr+"/news/review/"+this.newsid,{
            yourname:this.state.yourname || '',
            yourreview: this.state.yourreview || ''
        }).then((res)=>{
            e.target.disabled=false;
            this.state.yourname = '';
            this.state.yourreview = '';
            e.target.parentNode.reset();
            this.checkReview();

            if(res.data === "SUBMITED_INTERVAL_IS_ILLEGAL"){
                    alert("您提交得过于频繁，请休息片刻。");
                    return;
            }
        }).catch((err)=>{
            console.log(err);
        })
    }

   //回复处理区域 开始  --------->
    replyClickHandler(e,reviewId,replyId,replyName){ // reviewid almost equals replyid
        //console.log("reply Click Handler.");
        let replyForm = (<div className="replyForm">
                            <div className="myReviewInsideArea">
                                <form method="post" className="myReviewForm">
                                    <div className="myNickName">
                                        <label htmlFor="replyername" style={{fontSize:'12px',color:'gray',margin:0}}>Your Name:</label>
                                        <input type="text" maxLength="24" name="replyername" id="replyername" placeholder="Donald J. Trump"  onChange={(e)=>{this.changeHandle(e)}}/>
                                    </div>
                                    <div className="myReview">
                                        <label htmlFor="replyerreview" style={{fontSize:'12px',color:'gray',margin:0}}>Your Review:</label>
                                        <textarea maxLength="1000" name="replyerreview" id="replyerreview" rows="4" cols="50" placeholder="Make America Great Again."  onChange={(e)=>{this.changeHandle(e)}}/>
                                    </div>
                                    <div style={{display:'flex',justifyContent:'flex-end'}}>
                                        <input  type="reset" value="Cancel" onClick={(e)=>{this.cancelReply(e)}}/>
                                        <input  type="submit" value="Submit Your Review" onClick={(e)=>{this.submitReply(e, reviewId, replyId,replyName)}} />
                                    </div>
                                </form>
                            </div>
                        </div>);

            let lastActiveElem = this.state.replyArea.activeElem.pop();
            lastActiveElem && (this.state[lastActiveElem]='');
            this.state.replyArea.activeElem.push("replyArea_id_"+(replyId||reviewId));

            this.state["replyArea_id_"+(replyId||reviewId)] = replyForm;
            this.forceUpdate();
    }

    cancelReply(e){
        let lastActiveElem = this.state.replyArea.activeElem.pop();
        lastActiveElem && (this.state[lastActiveElem] = '');
        this.state.replyername='';
        this.state.replyerreview='';
        this.forceUpdate();
    }

    submitReply(e, reviewId, replyId, replyName){
        e.preventDefault();
        e.target.disabled=true;
        e.persist();

        if(!this.checkForm(this.state.replyername,this.state.replyerreview) ){
            e.target.disabled=false;
            return false;
        }
        

        axios.post(rootAddr+"/news/reply/"+this.newsid+"/"+reviewId,{
            replyername: this.state.replyername || '',
            replyerreview: (replyId?"To「"+replyName+"-"+replyId.slice(20)+"」:　":'') + (this.state.replyerreview || '')
        }).then((res)=>{
            e.target.disabled=false;
            this.cancelReply();
            this.checkReview();

            if(res.data === "SUBMITED_INTERVAL_IS_ILLEGAL"){
                alert("您提交得过于频繁，请休息片刻。");
                return;
            }

        }).catch((err)=>{
            console.log(err);
        })
    }

    //<---------- 回复处理区域 结束
    elapsedTime(curtime,thattime){
            let thatTime = (new Date(thattime)).getTime();
            let curTime = (new Date(curtime)).getTime();
            let diffTime = new Date(curTime-thatTime);//ms
                    let year = diffTime.getUTCFullYear()-1970;
                    let month = diffTime.getUTCMonth();
                    let date = diffTime.getUTCDate()-1;
                    let hour = diffTime.getUTCHours();
                    let min = diffTime.getUTCMinutes();
                    let sec = diffTime.getUTCSeconds();
                            if(year>0) return year + " year"+ (year>1?'s':'')+ " ago";
                            if(month>0) return month + " month"+ (month>1?'s':'')+ " ago";
                            if(date>0) return date + " day"+ (date>1?'s':'')+ " ago";
                            if(hour>0) return hour + " hours"+ (hour>1?'s':'')+ " ago";
                            if(min>0) return min + " minute"+ (min>1?'s':'')+ " ago";
                            if(sec>0) return sec + " second"+ (sec>1?'s':'')+ " ago";
            return "0 second ago";
    }


    //like button handler
    likeButtonHandler(e,v,reviewId,isLiked){
            e.preventDefault();
            e.target.disabled=true;
            e.persist();

            axios.post(rootAddr+"/news/reviewLike/"+this.newsid+"/"+reviewId, {
                isPositive: !isLiked
            }).then((res)=>{
                e.target.disabled = false;
                v.isLiked = !v.isLiked;
                this.checkReview();
            }).catch((err)=>{
                console.log(err);
            })
    }

    hateButtonHandler(e,v,reviewId,isHated){
            e.preventDefault();
            e.target.disabled=true;
            e.persist();
    
            axios.post(rootAddr+"/news/reviewHate/"+this.newsid+"/"+reviewId, {
                isPositive: !isHated
            }).then((res)=>{
                e.target.disabled=false;
                v.isHated = !v.isHated;
                this.checkReview();
            }).catch((err)=>{
                console.log(err);
            })
    }

    //
    replyLikeButtonHandler(e, v, reviewId, reply, replyId, isLiked){
            e.preventDefault();
            e.target.disabled=true;
            e.persist();

            axios.post(rootAddr+"/news/replyLike/"+this.newsid+"/"+reviewId+"/"+replyId, {
                isPositive: !isLiked
            }).then((res)=>{
                e.target.disabled = false;
                reply.isLiked = !reply.isLiked;
                this.checkReview();
            }).catch((err)=>{
                console.log(err);
            })
    }

    replyHateButtonHandler(e, v, reviewId, reply, replyId, isHated){
            e.preventDefault();
            e.target.disabled=true;
            e.persist();

            axios.post(rootAddr+"/news/replyHate/"+this.newsid+"/"+reviewId+"/"+replyId, {
                isPositive: !isHated
            }).then((res)=>{
                e.target.disabled=false;
                reply.isHated = !reply.isHated;
                this.checkReview();
            }).catch((err)=>{
                console.log(err);
            })
    }   

    removeMyReview( e, review, reviewId ){
            //console.log("my review need to delete.",reviewId);

            e.preventDefault();
            e.target.disabled=true;
            e.persist();

            axios.delete(rootAddr+"/news/review/"+this.newsid+"/"+reviewId)
            .then((res)=>{
                e.target.disabled=false;
                this.checkReview();
            }).catch((err)=>{
                console.log(err);
            })
    }

    removeMyReply( e, review, reviewId, reply, replyId ){
            //console.log("my reply need to delete.")
            e.preventDefault();
            e.target.disabled=true;
            e.persist();

            axios.delete(rootAddr+"/news/reply/"+this.newsid+"/"+reviewId+"/"+replyId)
            .then((res)=>{
                    e.target.disabled=false;
                    this.checkReview();
            }).catch((err)=>{
                    console.log(err);
            })
    }

    gotoTop(event){
        window.scrollTo({
            left:0,top:0,
            behavior:'smooth'
        })
    }


    render(){
        let news = this.state.news;

        return news ? <div className="pageBackground">
            <div className="newsPage">
                <div className="title">{news.title}</div>
                <hr style={{border:"1px solid black"}}/>
                <div className="source">{news.source}</div>
                <div className="content" dangerouslySetInnerHTML={{__html:news.content}}></div>
                <div className="timestamp">{news.timestamp}</div>
                <Link className="closePage" to={linkPath}>Close</Link>
                <div className="newsGotoTop" onClick={ (e)=>{this.gotoTop(e)} }>Top</div>
            </div>
            {
                    !this.state.reviewHasUnfolded && 
                    <div className="unfoldReview" onClick={(e)=>{this.checkReview(e)}}>查看评论「{news.repliesCount}」</div>
            }
            {
                    this.state.reviewHasUnfolded && 
                    <div className="reviewArea">
                        <div className="myReviewArea">
                            <div className="myReviewInsideArea">
                                <form method="post" className="myReviewForm">
                                    <div className="myNickName">
                                        <label htmlFor="yourname" style={{fontSize:'12px',color:'gray',margin:0}}>Your Name:</label>
                                        <input type="text" maxLength="24" name="yourname" id="yourname" placeholder="Donald J. Trump"  onChange={(e)=>{this.changeHandle(e)}}/>
                                    </div>
                                    <div className="myReview">
                                        <label htmlFor="yourreview" style={{fontSize:'12px',color:'gray',margin:0}}>Your Review:</label>
                                        <textarea name="yourreview" maxLength="1000" id="yourreview" rows="4" cols="50" placeholder="Make America Great Again."  onChange={(e)=>{this.changeHandle(e)}}/>
                                    </div>
                                    <input  type="submit" value="Submit Your Review" onClick={(e)=>{this.submitReview(e)}} />
                                </form>
                            </div>
                        </div>
                    {   
                        this.state.reviews.length>0 && <div className="orderBy">
                                <button className="latest" style={{color: this.state.sortButton.latest?'red':''}} onClick={(e)=>{this.updateReviewByOrder(e,"latest")}}>最近评论</button>
                                <button className="earliest" style={{color: this.state.sortButton.earliest?'red':''}} onClick={(e)=>{this.updateReviewByOrder(e,"earliest")}}>最早评论</button>
                                <button className="mostreplied" style={{color: this.state.sortButton.mostreplied?'red':''}} onClick={(e)=>{this.updateReviewByOrder(e,"mostreplied")}}>最多回复</button>
                                <button className="mostliked" style={{color: this.state.sortButton.mostliked?'red':''}} onClick={(e)=>{this.updateReviewByOrder(e,"mostliked")}}>最多喜欢</button>
                                <button className="mosthated" style={{color: this.state.sortButton.mosthated?'red':''}} onClick={(e)=>{this.updateReviewByOrder(e,"mosthated")}}>最多仇恨</button>
                        </div>
                    }
                    {        
                         this.state.reviews.map((v,ix)=>{
                            return (
                                <div className="reviewMainArea" key={v._id}> 
                                    {/* 评论区域 */}
                                    <div className="reviewInsideArea" >
                                        <div className="nickName">
                                            {v.name}

                                            <span>
                                                { v.removable && <button className="removable" onClick={ (e)=>{this.removeMyReview(e, v, v._id)} }>X</button>}
                                            </span>
                                        </div>
                                        <div className="hisReview">
                                                <span style={{margin:'0 10px',position:'absolute',left:'-40px',top:'5px',whiteSpace:'nowrap'}}>
                                                    <span className="reviewTimestamp">
                                                        { this.elapsedTime(v.currentTime, v.timestamp) }
                                                    </span>
                                                    <span className="reivewId">
                                                        {v.ix+1}F-{v._id.slice(16)}
                                                    </span>
                                                </span>
                                                    {v.review}
                                                <span style={{margin:'0 10px',position:'absolute',right:'-5px',bottom:'5px'}}>
                                                    <button className="reviewReply" onClick={(e)=>{this.replyClickHandler(e,v._id)}}>REPLY</button>
                                                </span>
                                        </div>              
                                        <div className="reviewFooter">
                                            <span style={{margin:'0 10px'}}>
                                                <button className="reviewLikeButton" style={ v.isLiked?{color:'white'}:{color:'black'} } onClick={ (e)=>{ this.likeButtonHandler(e, v, v._id, v.isLiked) } }>LIKE</button>
                                                <button className="likeCount" disabled>{v.likeCount}</button>
                                            </span>
                                            <span style={{margin:'0 10px'}}>
                                                <button className="reviewHateButton" style={ v.isHated?{color:'white'}:{color:'black'} } onClick={ (e)=>{ this.hateButtonHandler(e, v, v._id, v.isHated) } }>HATE</button>
                                                <button className="hateCount" disabled>{v.hateCount}</button>
                                            </span>

                                            
                                        </div>
                                    </div>
                                    <div className="replyArea"> {this.state["replyArea_id_"+v._id]}</div>
                                    {/* 评论回复区域 */}
                                    {
                                        v.reply && v.reply.map((rep,repix)=>{
                                            return(
                                                <div className="areaForReply" key={rep._id}>
                                                    <div className="reviewReplyArea" >
                                                            <div className="reviewReplyNickName">
                                                                {rep.name}
                                                                <span>
                                                                    { rep.removable && <button className="removable" onClick={ (e)=>{this.removeMyReply(e, v, v._id, rep, rep._id)} }>Х</button>}
                                                                </span>
                                                            </div>
                                                            <div className="hisReview">
                                                                <span style={{margin:'0 10px',position:'absolute',left:'-40px',top:'5px',whiteSpace:'nowrap'}}>
                                                                    <span className="reviewTimestamp"  style={{background:"#d4d6cf"}}>
                                                                        { this.elapsedTime(v.currentTime, rep.timestamp) }
                                                                    </span>
                                                                    <span className="reivewId" style={{background:"#d4d6cf"}}>
                                                                        {v.ix+1}F#{repix+1}-{rep._id.slice(16)}
                                                                    </span>
                                                                </span>
                                                                    {rep.review}
                                                                <span style={{margin:'0 10px',position:'absolute',right:'-5px',bottom:'5px'}}>
                                                                    <button className="reviewReply" style={{borderStyle:'dotted',color:'black'}} onClick={(e)=>{this.replyClickHandler(e, v._id, rep._id, rep.name)}}>REPLY</button>
                                                                </span>
                                                            </div>              
                                                            <div className="reviewReplyFooter">
                                                                <span style={{margin:'0 10px'}}>
                                                                    <button className="reviewLikeButton" style={ rep.isLiked?{color:'white'}:{color:'black'} } onClick={ (e)=>{this.replyLikeButtonHandler(e, v, v._id, rep, rep._id, rep.isLiked)} }>LIKE</button>
                                                                    <button className="likeCount" disabled>{rep.likeCount}</button>
                                                                </span>
                                                                <span style={{margin:'0 10px'}}>
                                                                    <button className="reviewHateButton" style={ rep.isHated?{color:'white'}:{color:'black'} } onClick={ (e)=>{this.replyHateButtonHandler(e, v, v._id, rep, rep._id, rep.isHated)} }>HATE</button>
                                                                    <button className="hateCount" disabled>{rep.hateCount}</button>
                                                                </span>
                                                                

                                                            </div>
                                                        
                                                    </div>
                                                    <div>{this.state["replyArea_id_"+rep._id]}</div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            )       
                        })
                    }

{/*reviewArea*/}</div>
            }
        {
                    this.state.display && <div className="loading">Loading...</div>
        }
        </div> : <div></div>
    }
}