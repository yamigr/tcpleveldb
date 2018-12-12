const net = require('net');

const EventEmitter = require('events').EventEmitter;
const async = require('async')
var Database = require('./Database')

var helpers = require('./helpers')

class TcpDbServer extends EventEmitter {

    constructor(port, host, username, password){
        super();
        this._server = net.createServer()
        this._socket = {}
        this._host = host ? host : 'localhost'
        this._port = port ? port : 2222
        this.db = {}
        this.eof = '\r\n'
        this._secret = (username && password) ? username + password : ''

    }

    set host(host){
        this._host = host
    }

    set port(port){
        this._port = port
    }

    get address(){
        return this._host + ':' + this._port
    }

    /** 
     * connect the server, init the events and listen to data
    */
    connection(){
        let self = this
        this._server.on('connection',function(sock){
            self.events(sock)
            self.data(sock)
        })
    }

    /**
     * create the listen server and waiting for messages.
     * When the data arrived, wait until this eof to make the next steps
     * Big Data will emitted as chunks
     * The determing-sign is defined as eof
     * 
     * @param {function} callback 
     */
    listen(callback){
        let self = this
        callback = callback || function(){}
        this.connection()
        this._server.listen({host: this._host, port: this._port} , function() {  
            callback(self._port, self._host)
        });
    }

    /**
     * Handle the data
     * @param {socket} sock socket instance
     */
    data(sock){

        let self = this
        let index = -1
        let chunk = ''
        let queue = []
        let received_data = ''
        let max_len = 2000
        //handle the data chunk
        //add data to chunk and check if it has a eof-delimiter. 
        //If so, split the chunk in to array and loop the queue asnyc while testing if it can parse to json else write string to chunk and read next

        sock.on('data', function(data) {
    
            chunk += data.toString()
            index = chunk.indexOf(self.eof)

            if(chunk.length >= max_len){
              sock.pause()
              received_data += JSON.parse(JSON.stringify(chunk))
              chunk = ''
              sock.resume()
            }
    
            if(index !== -1){
                queue = self.buildQueue(received_data + chunk)
                async.forEachOf(queue, function(element, index, next){
                    try{

                        element = JSON.parse(element)

                        self.emit('clientMessage', element)

                        if(!self._secret && !element.chk || helpers.createHash(self._secret, element.qid) === element.chk){
                            self.database(element, function(docs){
                                Object.assign(element, { data : docs })
                                sock.write(Buffer.from(JSON.stringify(element) + self.eof), 'utf-8')
                                next()
                            })
                        }
                        else{
                            sock.write(Buffer.from(JSON.stringify({qid : element.qid, data : {err : 'permission denied', data : ''}}) + self.eof), 'utf-8')
                            next()
                        }

                    }
                    catch(e){
                       
                       chunk = element
                       next(e)
                    }   
                },function(err){
                   
                   received_data = ''
                })
                
               
            }
        });
    }

    /**
     * handle the received data and split it to the packages by delimiter
     * @param {string} str 
     */
    buildQueue(str){
      return str.split(this.eof)
    }

    /**
     * handle the events
     * @param {socket} sock 
     */
    events(sock){
        let self = this
        let remoteAddress = sock.remoteAddress + ':' + sock.remotePort;

        self.emit('clientConnected', 'Client connected: ' + remoteAddress);

        //handle the certain events
        sock.on('end', function(){
            self.emit('end', 'end');
        });

        sock.on('close',  function () {
            self.emit('close', 'Socket close:',remoteAddress);
            sock.destroy();
        });

        sock.on('error', function (err) {
            self.emit('error', err.message);
        });
    }

    /**
     * Handle the database
     * @param {socket} socket 
     * @param {object} data 
     */
    database(data, callback){
        let self = this

        if(!(this.db[data.db] instanceof Database)){
            this.db[data.db] = new Database(data.db)
        }

        this.db[data.db].handler(data.meta, data.data, function(docs){
            callback(docs)
        }) 

    }
}



module.exports = TcpDbServer
