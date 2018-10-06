
//------------------configuration--------------------

    let mongodbSvrPath = "C:/Users/kska3/Desktop/mongodb";//数据库服务器的根目录地址
    let httpsSvrPort = 8080;//www服务器端口， 
    
    //简单的添加新闻，可以用localhost:port/update，只供测试之用
    //最好用数据库管理工具来后台编辑新增新闻条目和恶意评论，比如：nosqlbooster


//---------------------------------------------------

var childProcess = require('child_process'); 
var express = require('express');

var path = require("path");
var bodyParser = require("body-parser");
var myMongoDb = require("./MyMongoDB.js");


var app = express();
const newsNumPerRequest = 2;

const mongodb = require("mongodb");

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({limit:"300kb"}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req,res,next)=>{ 
  req.db = app.get('db');
  next(); 
});



myMongoDb.start(mongodbSvrPath).connectDB((dbColl)=>{
    app.set('db',dbColl);
    app.listen(httpsSvrPort, function () {
        console.log('Example app listening on port '+ httpsSvrPort+'!');
        
        childProcess.exec('start http://localhost:'+httpsSvrPort+"/update");

        childProcess.exec('start http://localhost:'+httpsSvrPort);
    });
});

/*
    app.all('/*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header('Access-Control-Allow-Methods', "*");
        res.header("Access-Control-Allow-Headers", "*");
        next();
    });
*/
//-------------------------------------------------//

const router = express.Router();
app.use("/",router);

router.get('/',async (req, res)=>{
  //const cc = req.db.collection("news");
  //res.send('Hello World! ' + await cc.countDocuments());
});




router.post('/news/:newsid',async (req,res)=>{
        //console.log("req.params:",req.params);
        let newsid = req.params.newsid;
        let cc = req.db.collection("news");
        let news = JSON.stringify( 
                        (await cc.aggregate([
                            {$match:{_id:mongodb.ObjectID(newsid)}},
                            {$project: {
                                title:"$title",
                                source:"$source",
                                timestamp:"$timestamp",
                                content:"$content",
                                reviewsCount:{$size:"$reviews"},
                                replyCount:{
                                    $map:{
                                        input:"$reviews.reply",
                                        as:"reply",
                                        in:{
                                            $size:"$$reply"
                                        }
                                    }
                                }
                            }},
                            {$project: {
                                title:"$title",
                                source:"$source",
                                timestamp:"$timestamp",
                                content:"$content",
                                repliesCount:{
                                    $reduce:{
                                        input:"$replyCount",
                                        initialValue:0,
                                        in:{
                                            $sum:["$$this","$$value",1], 
                                        }
                                    }
                                }
                            }},
                        ]).toArray())[0]
                    );
        res.end(news);
})


router.post('/news/page/:curNewsCount/',async(req,res)=>{
    const cc = req.db.collection("news");
    let skipNumber = req.params.curNewsCount >=0 ? Number(req.params.curNewsCount) : 0;

    let r = JSON.stringify( 
            await cc.aggregate([
                {$project: {
                    title:"$title",
                    source:"$source",
                    timestamp:"$timestamp",
                    content:"$content",
                    reviewsCount:{$size:"$reviews"},
                    replyCount:{
                        $map:{
                            input:"$reviews.reply",
                            as:"reply",
                            in:{
                                $size:"$$reply"
                            }
                        }
                    }
                }},
                {$project: {
                    title:"$title",
                    source:"$source",
                    timestamp:"$timestamp",
                    content:"$content",
                    repliesCount:{
                        $reduce:{
                            input:"$replyCount",
                            initialValue:0,
                            in:{
                                $sum:["$$this","$$value",1], 
                            }
                        }
                    }
                }},
            ])
            .sort({_id:-1})
            .skip(skipNumber)
            .limit(newsNumPerRequest)
            .toArray() 
    ) ;
    res.end(r);
})


//可以更新like/hate 按钮
//db.getCollection('news').updateOne({_id:ObjectId("5b796e5e2fcd0c503ab90c7d")},{$addToSet:{'reviews.0.like':"192.168.0.1"}},{upsert:true})

//获取like/hate数组的长度，以代表受欢迎度。
//db.getCollection('news').aggregate([{"$match":{_id:ObjectId("5b796e5e2fcd0c503ab90c7d")}},{"$unwind":"$reviews"},{"$project":{_id:1,likeCount:{$size:'$reviews.like'}}}])

router.post('/news/getReview/:newsid',async (req,res)=>{
    const newsid = req.params.newsid;
    const cc = req.db.collection("news");
    const ip = req.ip;

    const orderBy = req.body.orderBy;
    //console.log("orderBy:",orderBy);

    //let reviews = await cc.findOne( {_id:mongodb.ObjectID(newsid)}, {projection:{_id:0,reviews:1}} );
    //console.log("newsid:",newsid);

    let reviews = await cc.aggregate([
      {$match:{ _id:mongodb.ObjectID(newsid) }},
      {$unwind: { path:"$reviews", includeArrayIndex: "index" }},
      {$project:{
          _id:"$reviews._id",
          ix:"$index" ,
          name:'$reviews.name',
          review:'$reviews.review',
          timestamp:'$reviews.timestamp',
          currentTime: Date(),
          likeCount:{$size:'$reviews.like'},
          hateCount:{$size:'$reviews.hate'},
          replyCount:{$size:'$reviews.reply'},
          isLiked:{$in:[ip,"$reviews.like.ip"]},
          isHated:{$in:[ip,"$reviews.hate.ip"]},
          removable:{$eq:["$reviews.ip",ip]},
          reply:{
            $map:{
              input:"$reviews.reply",
              as: "reply",
              in:{
                  _id:"$$reply._id",
                  name:"$$reply.name",
                  review:"$$reply.review",
                  timestamp:"$$reply.timestamp",
                  likeCount:{$size:'$$reply.like'},
                  hateCount:{$size:'$$reply.hate'},
                  isLiked:{$in:[ip,"$$reply.like.ip"]},
                  isHated:{$in:[ip,"$$reply.hate.ip"]},
                  removable:{$eq:["$$reply.ip",ip]},
              }
            }
          }
      }},
    ]).sort(orderBy).toArray();
   
    res.end(JSON.stringify(reviews));
});

//submit review.
router.post('/news/review/:newsid',async (req,res)=>{
    const newsid = req.params.newsid;
    const name = req.body.yourname;
    const review = req.body.yourreview;
    const ip = req.ip;

    //检测提交间隔时间，如果不足指定时间则提前返回。
    let isIllegal = await isIntervalIllegal(req);
    //console.log("is Illegal ?",isIllegal)
    if(isIllegal) return res.end("SUBMITED_INTERVAL_IS_ILLEGAL");
    //
    
    const cc = req.db.collection("news");
    let r = await cc.updateOne({_id:mongodb.ObjectID(newsid)},{
        $addToSet:{
            reviews:{
                _id:mongodb.ObjectID(),
                name,review,
                timestamp:Date(),ip,
                like:[],hate:[],
                reply:[]
            }
        }
    },{upsert:true});

    logVisitors(req,newsid);

    //console.log(":newsid....");
    //console.log("review. "+newsid,name,review,ip );
    res.end("newsid:"+newsid);
});


//submit reply.
router.post('/news/reply/:newsid/:reviewid', async (req,res)=>{
        /*
            db.news.updateOne(
                  { _id:ObjectId("5b796e5e2fcd0c503ab90c7d") },
                  { $addToSet:{ "reviews.$[review].reply":{name:"okokokok"} } },
                  {
                      arrayFilters:[
                          {
                              "review._id":{$eq:ObjectId("5b84eabb8f64078681a54494")}
                          }
                      ]
                  }
            )
        */
        const newsid = req.params.newsid;
        const reviewId = req.params.reviewid;

        const name = req.body.replyername;
        const review = req.body.replyerreview;
        const ip = req.ip;

        let isIllegal = await isIntervalIllegal(req);
        console.log("is Illegal? ",isIllegal);
        if(isIllegal) return res.end("SUBMITED_INTERVAL_IS_ILLEGAL");
        

        const cc = req.db.collection("news");
        let findobj = { _id: mongodb.ObjectID(newsid) };

        let project = {
              $addToSet:{
                    "reviews.$[reviewElem].reply": {
                            "_id" : mongodb.ObjectID(),
                            "name" : name,
                            "review" : review,
                            "timestamp" : Date(),
                            "ip" : ip,
                            "like" : [], "hate" : []
                    }
              }
        }
        
        let options = { 
              arrayFilters: [ 
                  { 
                      "reviewElem._id": { $eq: mongodb.ObjectId(reviewId) },
                      "reviewElem.reply.review": { $ne: review }
                  } 
              ] 
        };

        let r = await cc.updateOne( findobj, project, options );
        logVisitors(req,newsid);

        res.end("newsid:"+1);
});


function addStampOnReview(stampType="like"){
      //db.news.update(
      //  { "_id" : ObjectId("5b796e5e2fcd0c503ab90c7d") },
      //  { $pull:{"reviews.$[elem].like" : {ip:"100.110.120.1332",timestamp:{$regex:/.*/gi}}} },
      //  { 
      //        arrayFilters:[ 
      //            {
                   //   "elem._id":{$eq:ObjectId("5b84eabb8f64078681a54413")},
      //                "elem.like.ip": {$eq:"100.110.120.1332"} 
                   //} 
      //        ]
      //  }
      //)
      return async (req,res)=>{
            const likeORhate = stampType;

            const newsid = req.params.newsid;
            const reviewId = req.params.reviewid;
          
            const isPositive = req.body.isPositive;
            //console.log("isPositive:", isPositive===true);
            const ip = req.ip;
            const cc = req.db.collection("news");
          
            let findObj = {};
                findObj["_id"] = mongodb.ObjectId(newsid);          

            let projectObj = {};
                  projectObj[isPositive ? '$addToSet' : '$pull'] = {}
                  projectObj[isPositive ? '$addToSet' : '$pull']["reviews.$[elem]."+likeORhate] = {
                        ip: ip,
                        timestamp: ( isPositive ? Date() : {$regex:/.*/gi} )
                  }

            let options = {};
                    let filters = { 
                      "elem._id":{$eq: mongodb.ObjectId(reviewId)},
                      ["elem."+ likeORhate +".ip"]: { [isPositive ? "$ne" : "$eq"]: ip }
                    };

                options['arrayFilters']= [filters];

            let r = await cc.updateOne( findObj, projectObj, options );
            //console.log("its ok? ",r.result);
            res.end(JSON.stringify(r.result));
      }
}

// likeStamp + 1
router.post('/news/reviewLike/:newsid/:reviewid',addStampOnReview("like"));
// hateStamp +1
router.post('/news/reviewHate/:newsid/:reviewid',addStampOnReview("hate"));



function addStampOnReply(stampType="like"){
/*
  db.news.update(
    { "_id" : ObjectId("5b796e5e2fcd0c503ab90c7d") },
    { $addToSet:{"reviews.$[reviewElem].reply.$[replyElem].like" : {ip:"100.110.120.1235",timestamp:Date()} } },
    { arrayFilters:[                                     
              { "reviewElem._id": {$eq: ObjectId("5b84eabb8f64078681a54413")} } , 
              { 
                  "replyElem._id": {$eq: ObjectId("5b84eb3d8f64078681a54414")}, 
                  "replyElem.like.ip":{$ne:"100.110.120.1235"} 
              }
     ]
    }
  )
*/
      return async (req,res)=>{
            const likeORhate = stampType;

            const newsid = req.params.newsid;
            const reviewId = req.params.reviewid;
            const replyId = req.params.replyid;

            const isPositive = req.body.isPositive;

            const ip = req.ip;
            const cc = req.db.collection("news");

            let findObj = {};
                findObj["_id"] = mongodb.ObjectID(newsid);

            let projectObj = { [isPositive ? '$addToSet' : '$pull']: {} }
                projectObj[isPositive ? '$addToSet' : '$pull']["reviews.$[reviewElem].reply.$[replyElem]."+likeORhate] = {
                      ip: ip,
                      timestamp: ( isPositive ? Date() : {$regex:/.*/gi} )
                }

            let options = {};
                let filters1 = { ["reviewElem._id"]: {$eq: mongodb.ObjectId(reviewId)} } ;
                let filters2 = { 
                    "replyElem._id": {$eq: mongodb.ObjectId(replyId)}, 
                    ["replyElem."+likeORhate+".ip"] : {[isPositive ? "$ne" : "$eq"]:ip} 
                }  
                options['arrayFilters'] = [filters1,filters2];

            let r = await cc.updateOne( findObj, projectObj, options );
            res.end(JSON.stringify(r.result));
      }
}

// likeStamp + 1 on Reply
router.post('/news/replyLike/:newsid/:reviewid/:replyid',addStampOnReply("like"));
//  hateStamp + 1 on Reply
router.post('/news/replyHate/:newsid/:reviewid/:replyid',addStampOnReply("hate"));


router.delete("/news/review/:newsid/:reviewid",async (req,res)=>{
      //console.log("review removable.");

      const newsId = req.params.newsid;
      const reviewId = req.params.reviewid;

      const ip = req.ip;
      const cc = req.db.collection("news");

      /*
          db.news.updateOne(
            { _id:ObjectId("5b796e5e2fcd0c503ab90c7d") },
            { $pull:{ "reviews":{_id:ObjectId("5b865ebf9961a4b6a1a5c287"),ip:"::1" } } }
          )
      */
     let findObj = { _id: mongodb.ObjectId(newsId) };
     let project = { $pull: { reviews:{ _id:mongodb.ObjectId(reviewId), ip } } };

      let {result} = await cc.updateOne( findObj, project );
      res.end( JSON.stringify(result) );
      
})

router.delete("/news/reply/:newsid/:reviewid/:replyid",async (req,res)=>{
    //console.log("reply removable.");
    const newsId = req.params.newsid;
    const reviewId = req.params.reviewid;
    const replyId = req.params.replyid;

    const ip = req.ip;
    const cc = req.db.collection("news");

    /*
        db.news.updateOne(
            { _id:ObjectId("5b796e5e2fcd0c503ab90c7d") },
            { $pull:{ "reviews.$[review].reply":{_id:ObjectId("5b865de6372ee0afcd51df0a"),ip:"::1" } } },
            { arrayFilters:[ {"review._id":{ $eq: ObjectId("5b84eabb8f64078681a54494") }} ] }
        )
    */
    
    let findObj = {_id: mongodb.ObjectId(newsId)};
    let project = {
        $pull:{ "reviews.$[reviewElem].reply":{ _id:mongodb.ObjectId(replyId), ip } }
    }

    let options = { arrayFilters: [ {"reviewElem._id":{$eq:mongodb.ObjectId(reviewId)}}] }

    let {result} = await cc.updateOne( findObj, project, options );

    res.end(JSON.stringify(result));
})


//后台添加新闻
//get: /update是用来编辑添加文章，实际运营时建议加密或删除。
router.post('/update',async function(req, res, next) {
    //console.log("req.body:",req.body);

    let newsDB = req.db.collection("news");
    let q = req.body;
        
    let r = await newsDB.updateOne(
          { title:q.title },
          {
            $set:{
              title: q.title, 
              source: q.source, 
              timestamp: Date(),
              content: q.content.replace(/\r\n/gi,"<br>"),
              reviews:[]
            }
          },
          { upsert:true }
      );
    if(r.result.ok==1){
        res.send(`
          <html>
            <body>
              IT IS VERY OK. <font id="time"></font>
            </body>
            <script>
              let back = ()=>{ window.location.replace("/update") };
              let timemax = 3;
              let tid = setInterval(()=>{
                document.querySelector("#time").innerText = timemax--;
                if(timemax<0){
                    clearInterval(tid);
                    back();
                }
              },1000);
            </script>
          </html>
        `);
    }else{
      res.send('Error...Sorry. Please Try Again.');
    }
});


// 检测最后提交评论或回复的时间戳。并返回合法性。
async function logVisitors(req,newsid,coll='visitorsSubmitlogger'){
    let cc = req.db.collection(coll);
    let findobj = { ip:req.ip };
    let updateobj = {
      $set:{ ip:req.ip },
      $addToSet:{
          agent: req.headers['user-agent'],
          language: req.headers['accept-language']
      },
      $push:{
        footprint: {$each: [{newsid:mongodb.ObjectId(newsid),timestamp:Date()}], $slice: -200 }
      },
      $inc:{ count:+1 }
    }

    let r = await cc.updateOne(findobj,updateobj,{upsert:true});
    return r.result;
}

async function getLTSby(req,coll='visitorsSubmitlogger'){//LTS=> Latest TimeStamp
    let cc = req.db.collection(coll);
    let r = await cc.find({ip:req.ip})
        .project({footprint:{$slice:-1}, ip:0, agent:0, count:0, language:0}).toArray();
    return r.length>0 ? r[0].footprint[0].timestamp : 0;
}

async function isIntervalIllegal(req,interval=30*1000){
      let thatTime = (new Date(await getLTSby(req))).getTime();
      let curTime = (new Date()).getTime();
      let diffTime = (new Date(curTime-thatTime)).getTime();//ms

      console.log("diftime:",diffTime);
      return diffTime<interval;
}
//-------------







/*  like/hate button
         db.getCollection('news').updateOne(
                { "_id" : ObjectId("5b796e5e2fcd0c503ab90c7d")},
                {$addToSet:{"reviews.0.like":{ip:"102.102.102.102",timestamp:Date()}}},
                {upsert:true}
          );
*/



// add like count
//    db.getCollection('news').updateOne(
//                { 
//                    "_id" : ObjectId("5b796e5e2fcd0c503ab90c7d"),
            //       "reviews.0.like":{$not:{$elemMatch:{ip:"102.102.102.106",timestamp:{$regex:/.*/gi}}}}
            //      },
            //    
            //      {$addToSet:{"reviews.0.like":{ip:"102.102.102.106",timestamp:Date()}}}
    //);


 

    // delete like count
 // db.getCollection('news').updateOne(
  //               {
    //                  "_id" : ObjectId("5b796e5e2fcd0c503ab90c7d"),
    //                  "reviews.0.like":{$elemMatch:{ip:"102.102.102.102",timestamp:{$regex:/.*/gi}}}
     /*                },
                    {
                        $pull:{
   */  //                        "reviews.0.like":{
      //                          ip:"102.102.102.102",timestamp:{$regex:/.*/gi}
      //                       }
      //                  }
      //              }
      //          );

 


/*
db.getCollection('news').aggregate([
      {$match:{ _id:ObjectId("5b796e5e2fcd0c503ab90c7d") }},
      {$unwind: { path:"$reviews", includeArrayIndex: "index" }},
      {$project:{
          ix:"$index" ,
          name:'$reviews.name',
          review:'$reviews.review',
          timestamp:'$reviews.timestamp',
          currentTime: Date(),
          likeCount:{$size:'$reviews.like'},
          ipExistInLike:{$in:["::1","$reviews.like.ip"]},
          ipExistInHate:{$in:["::1","$reviews.hate.ip"]},
          hateCount:{$size:'$reviews.hate'},
          reply:{
            $map:{
              input:"$reviews.reply",
              as: "reply",
              in:{
                  name:"$$reply.name",
                  review:"$$reply.review",
                  timestamp:"$$reply.timestamp",
                  likeCount:{$size:'$$reply.like'},
                  hateCount:{$size:'$$reply.hate'},
                  ipExistInLike:{$in:["::1","$$reply.like.ip"]},
                  ipExistInHate:{$in:["::1","$$reply.hate.ip"]}
              }
            }
          }
      }}
    ])




*/


