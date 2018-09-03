
const event = require('events');
const cp = require('child_process');
var MongoClient = require('mongodb').MongoClient;

class startMongoDB extends event {
    constructor(dbPath='D:/MongoDB/data/mydb', options){
        super(options);
        this.database = null;
        this.dbPath = dbPath;
        this.dbStartup();
    }

    dbStartup(){
        this.database = cp.spawn('mongod', [`--dbpath=${this.dbPath}`]);
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





