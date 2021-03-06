var net = require('net');
var async = require('async')
var shortid = require('shortid')
const EventEmitter = require('events').EventEmitter

var helpers = require('./helpers')

class TcpDbClient extends EventEmitter {

  constructor(port, host, username, password){
    super();
    this._client = {};
    this._host = host ? host : 'localhost'
    this._port = port ? port : 2222
    this.eof = '\r\n'
    this._queue = {}
    this._secret = (username && password) ? username + password : ''
    this._assignQuery = {}
    this.meta = {
      get : 'get',
      put : 'put',
      del : 'del',
      stream: 'stream',
      keys : 'keys',
      values : 'values',
      batch: 'batch',
      filter: 'filter',
      count: 'count',
      update: 'update'
    }
    this._key = '@key'
    this.reconnectTime = 10000
    this.connecting()
  }
  
  set host(host){
    this._host = host
  }

  set key(key){
    this._key = key
  }

  get key(){
    return this._key
  }


  set port(port){
    this._port = port
  }

  get address(){
    return this._host + ':' + this._port
  }

  get metaNames(){
    return this.meta
  }

  set addQuery(obj){
    if(typeof obj === 'object' && !obj.qid && !obj.chk && !obj.db && !obj.meta && !obj.data ){
      this._assignQuery = obj
    }
  }

  /**
   * create the query-object to send it to server
   * @param {string} db 
   * @param {string} meta 
   * @param {object} data 
   */
  createQueryObject(db, meta, data){

    let qid =  shortid.generate()
    let chk = this._secret ? helpers.createHash(this._secret, qid) : ''
    return Object.assign({}, this._assignQuery, {
      qid : qid,
      chk : chk,
      db : db,
      meta : meta,
      data : data
    })

  }

  // action methods

  get(db, key, callback){
    let data = this.createQueryObject(db, 'get', { key : key, value: ''})
    this._queue[data.qid] = callback
    this.send(data)
  }

  put(db, opt, callback){
    if(!opt.key){
      opt.key = shortid.generate()
    }
    else if(opt.key.indexOf(this._key) !== -1){
      opt.key = opt.key.replace(new RegExp(this._key, 'g'), shortid.generate())
    }
    let data = this.createQueryObject(db, 'put', { key : opt.key, value: opt.value})
   
    this._queue[data.qid] = callback
    this.send(data)
  }

  del(db, key, callback){
    let data = this.createQueryObject(db, 'del', { key : key, value: ''})
    this._queue[data.qid] = callback
    this.send(data)
  }

  batch(db, data, callback){
    data = this.createQueryObject(db, 'batch', data)
    this._queue[data.qid] = callback
    this.send(data)
  }

  stream(db, opt, callback){

    if(arguments.length === 2){
      callback = opt
      opt = {}
    }

    let data = this.createQueryObject(db, 'stream', opt)
    this._queue[data.qid] = callback
    this.send(data)
  }

  keys(db, opt, callback){

    if(arguments.length === 2){
      callback = opt
      opt = {}
    }

    let data = this.createQueryObject(db, 'keys', opt)
    this._queue[data.qid] = callback
    this.send(data)
  }

  values(db, opt, callback){

    if(arguments.length === 2){
      callback = opt
      opt = {}
    }

    let data = this.createQueryObject(db, 'values', opt)
    this._queue[data.qid] = callback
    this.send(data)
  }

  filter(db, opt, callback){

    let data = this.createQueryObject(db, 'filter', opt)
    this._queue[data.qid] = callback
    this.send(data)
  }

  count(db, opt, callback){

    if(arguments.length === 2){
      callback = helpers.callbackNoob(opt)
      opt = {}
    }

    let data = this.createQueryObject(db, 'count', opt)
    this._queue[data.qid] = callback
    this.send(data)
  }

  update(db, data, callback){
    data = this.createQueryObject(db, 'update', data)
    this._queue[data.qid] = callback
    this.send(data)
  }

  connecting(){
    let self = this

    // Create client and connect
    this._client = net.createConnection({ port: this._port, host: this._host }, () => {
      self.emit('connected', 'client connected:' + self.address);
    });

    // Add message handler
    this.data(this._client)

    // Add a 'close' event handler for the client socket
    this._client.on('close', function() {
      self.emit('close', 'Client closed at ' + Date());
    });

    // Try to reconnect
    this._client.on('error', function(err) {
      self.emit('error', err);
      setTimeout(function(){
        self.connecting()
      },this.reconnectTime)
    });
  }

  /**
   * sending data to server and handle the events
   * @param {object} data 
   */
  send(data){
    try{
      this._client.write(Buffer.from(JSON.stringify(data) + this.eof), 'utf-8');
    }
    catch(e){
      console.error(e)
    }
  }

  /**
   * handle the received data
   * @param {socket} sock 
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
    //If the data is complete fire the callback-function and delete the callback-queue

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

                if(typeof self._queue[element.qid] === 'function'){  
                  try{
                    self._queue[element.qid].apply(null,Object.values(element.data));
                    self.emit('data', element.data.err, element.data.data);
                    delete self._queue[element.qid]
                  }
                  catch(e){
                    console.error(e);
                  }
                }
                next()
            }
            catch(e){
              chunk = element
              next(e)
            }   
           },function(err){
             // sock.end()
              received_data = ''
           })
           
           
        }
      });
    }

    /**
     * split the data to packages by delimiter
     * @param {string} str 
     */
    buildQueue(str){
      return str.split(this.eof)
    }

    /**
     * 
     * @param {string} path 
     * @param {string} method 
     * @param {object} data 
     * @param {function} callback 
     */
    query(path, method, data, callback){
      let self = this
      callback = helpers.callbackNoob(callback)

      switch(method){
        case this.meta.get:
        this.get(path, data.key, function(err, data){
            callback({ err : err, data : data})
        })
        break
        case this.meta.put:
        this.put(path, data, function(err){
            callback({ err : err, data : data.key})
        })
        break
        case this.meta.del:
        this.del(path, data.key, function(err){
            callback({ err : err, data : data.key})
        })
        break
        case this.meta.batch:
        this.batch(path, data, function(err){
            callback({ err : err, data : data.length})
        })
        break
        case this.meta.stream :
        this.stream(path, data, function(err, data){
            callback({ err : err, data : data})
        })
        break
        case this.meta.keys :
        this.keys(path, data, function(err, data){
            callback({ err : err, data : data})
        })
        break
        case this.meta.values :
        this.values(path, data, function(err, data){
            callback({ err : err, data : data})
        })
        break
        case this.meta.count:
        this.count(path, data, function(err, numb){
            callback({ err : err, data : numb})
        })
        break
        case this.meta.filter:
        this.filter(path, data, function(err, docs){
            callback({ err : err, data : docs})
        })
        break
        case this.meta.update:
        this.update(path, data, function(err, docs){
            callback({ err : err, data : docs})
        })

        break
        default:
        callback({ err : 'query not exist.', data : ''})
        break
    }
  }

}

module.exports = TcpDbClient
