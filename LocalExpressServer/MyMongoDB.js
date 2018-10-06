
const event = require('events');
const cp = require('child_process');
const fs = require("fs");
var MongoClient = require('mongodb').MongoClient;
const mkdirp = require('mkdirp');


class startMongoDB extends event {
    constructor(dbSvrPath='D:/MongoDB', options){
        super(options);
        this.database = null;
        this.dbSvrPath = dbSvrPath;

        mkdirp(dbSvrPath+'/data/mydb', function(err){
            if (err) console.error(err)
        });

        this.dbStartup();
    }

    dbStartup(){
        this.database = cp.spawn(
            'mongod', 
            [`--dbpath=${this.dbSvrPath + "/data/mydb"}`], 
            {env:{path:this.dbSvrPath+'/bin'}}
        );
        this.database.stdout.on('data', (data) => {
            //console.log("data:",data.toString());
            if(data.indexOf("waiting for connections on port") !== -1){
                this.emit('readyGo');
            }else if(data.indexOf("make sure that another mongod instance is not already running") !== -1){
                this.emit('readyGo');
            }
        });
    }

    connectDB(callback){
        this.once('readyGo',()=>{
            MongoClient.connect("mongodb://localhost", { useNewUrlParser: true }).then(
                (r) => {
                    console.log("> MongoDB is OK.");
                    callback(r.db("mydb"))//a collection: mydb
                }
            );
        });
    }
}



function start(path){
    let mydb = new startMongoDB(path);
    return mydb;
}

module.exports = { start };





