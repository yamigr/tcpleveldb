"use strict"

const levelup = require('levelup')
const leveldown = require('leveldown')
const Bloc = require('bloc')
var helpers = require('./helpers')

class Database {

    constructor(path){
        this._path = path ? path : './db'
        this._db = levelup(leveldown(this._path))
    }

    isOpen(){
        return this._db.isOpen()
    }

    isClose(){
        return this._db.isClosed()
    }

    handler(method, data, callback){
        let self = this
        callback = helpers.callbackNoob(callback)

        switch(method){
            case 'get':
            this.get(data.key, function(err, data){
                callback({ err : err, data : data})
            })
            break
            case 'put':
            this.put(data.key, data.value, function(err){
                callback({ err : err, data : data.key})
            })
            break
            case 'del':
            this.del(data.key, function(err){
                callback({ err : err, data : data.key})
            })
            break
            case 'batch':
            data = data ? data : []
            this.batch(data, function(err){
                callback({ err : err, data : data.length})
            })
            break
            case 'stream':
            this.stream(data, function(err, data){
                callback({ err : err, data : data})
            })
            break
            case 'keys':
            this.keys(data, function(err, data){
                callback({ err : err, data : data})
            })
            break
            case 'values':
            this.values(data, function(err, data){
                callback({ err : err, data : data})
            })
            break
            case 'count':
            this.count(data, function(err, numb){
                callback({ err : err, data : numb})
            })
            break
            case 'filter':
            // ToDo: Filter optimizer, add method filter to Server, and filter directly while streaming. Because with this method bellow, it streams two times the same array scusi!
            this.stream({}, function(err, docs){
                Bloc.filter(docs, data).then(function(results) {
                    // Results contains all items in the `us-east-1` region.
                    callback({ err : err, data : results})
                  }, function(err) {
                   // Something went wrong
                   callback({ err : err, data : []})
                });
            })
            break
            case 'update':
            this.get(data.key, function(err, docs){
                let error = null
                if(docs && !err){
                    if(typeof docs.value === 'object'){

                        if(typeof data.value === 'object'){
                            Object.assign(docs.value, data.value)
                        }
                        else{
                            try{
                                Object.assign(docs.value, JSON.parse(data.value))
                            }
                            catch(e){
                                error = e
                            }
                        }
                    }
                    else{
                        docs.value = data.value
                    }
                    self.put(docs.key, docs.value, function(e){
                        if(e) error = e
                        callback({ err : error, data : docs.key})
                    })
                }
                else{
                    callback({ err : err, data : ''})
                }

            })

            break
            default:
            callback({ err : 'query not exist.', data : ''})
            break
        }
    }

    put(key , value, callback){
        callback = helpers.callbackNoob(callback)
        this._db.put(key, helpers.convertToBuffer(value), function (err) {
            callback(err ? err.toString() : null)
        })
    }

    get(key, callback){
        let self = this
        callback = helpers.callbackNoob(callback)
        this._db.get(key, function (err, value) {
            callback(err ? err.toString() : null, { key : key, value : helpers.convertFromBuffer(value)})
        })
    }

    del(key, callback){
        callback = helpers.callbackNoob(callback)
        this._db.del(key, function (err) {
            callback(err ? err.toString() : null)
        })    
    }

    /* example
    var ops = [
        { type: 'del', key: 'father' },
        { type: 'put', key: 'name', value: 'Yuri Irsenovich Kim' },
        { type: 'put', key: 'dob', value: '16 February 1941' },
        { type: 'put', key: 'spouse', value: 'Kim Young-sook' },
        { type: 'put', key: 'occupation', value: 'Clown' }
        ]
    */
    batch(data, callback){
        //check if a value has a object to convert it to a json-string
        callback = helpers.callbackNoob(callback)
        for(let i in data){
            if(typeof data[i].value === 'object'){
                data[i].value  =  JSON.stringify(data[i].value )
            }
        }

        if(data.length){
            this._db.batch(data, function (err) {
                callback(err ? err.toString() : null)
            })
        }
        else{
            callback('empty batch')
        }
    }

    /**
     * {gte: '', lte: '', gt, lt, start, end, reverse, limit, keys, values}
     */
    stream(options, callback){
        let self = this
        var docs = []
        var err = ''
        options = options ? options : {}
        callback = helpers.callbackNoob(callback)
        this._db.createReadStream(options)
            .on('data', function (data) {
                docs.push({ key :  helpers.convertFromBuffer(data.key), value :  helpers.convertFromBuffer(data.value)})
            })
            .on('error', function (err) {
                err = err
            })
            .on('end', function () {
                callback(err ? err.toString() : null, docs)
            })
    }

    /**
     * {gte: '', lte: '', gt, lt, start, end, reverse, limit, keys, values}
     */
    keys(options, callback){
        let self = this
        var docs = []
        var err = ''
        options = options ? options : {}
        callback = helpers.callbackNoob(callback)
        this._db.createKeyStream(options)
            .on('data', function (data) {
                docs.push( helpers.convertFromBuffer(data))
            })
            .on('error', function (err) {
                err = err
            })
            .on('end', function () {
                callback(err ? err.toString() : null, docs)
            })
    }

        /**
     * {gte: '', lte: '', gt, lt, start, end, reverse, limit, keys, values}
     */
    values(options, callback){
        let self = this
        var docs = []
        var err = ''
        options = options ? options : {}
        callback = helpers.callbackNoob(callback)
        this._db.createValueStream(options)
            .on('data', function (data) {
                docs.push( helpers.convertFromBuffer(data))
            })
            .on('error', function (err) {
                err = err
            })
            .on('end', function () {
                callback(err ? err.toString() : null, docs)
            })
    }

    count(options, callback){
        if(arguments.length === 1){
            callback = helpers.callbackNoob(options)
            options = {}
        }
        else{
            callback = helpers.callbackNoob(callback)
        }

        this.stream(options, function(err, docs){
            callback(err, docs.length)
        })
    }
}

module.exports = Database;