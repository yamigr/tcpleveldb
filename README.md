# tcpleveldb

> A node-js-tcp database environment with server and client on top of the leveldb.

You can run the server in a separate node-app as a standalone instance. Go to [server](#server).
Then you can use the client in your node-app, web-app or another magic stuff to query the database. Go to [client](#client).
You can find a web-gui to manage the database-servers here - [tcpleveldb-panel](https://github.com/yamigr/tcpleveldb-panel).

[![Build Status](https://travis-ci.org/yamigr/tcpleveldb.svg?branch=master)](https://travis-ci.org/yamigr/tcpleveldb)

Web-GUI - https://github.com/yamigr/tcpleveldb-panel

## Installing
```sh
npm install tcpleveldb --save
```
<a name="server"></a>
## Server

```js
var tcpleveldb = require('tcpleveldb')

var port = 2222
var host = 'localhost'
var user = ''
var password = ''

var srv = new tcpleveldb.Server(port, host, user, password)
srv.listen() 

//you can use some socket-events if needed
srv.on('end', function(msg){console.log(msg)})
srv.on('close', function(client){console.log(client)})
srv.on('error', function(err){console.log(err)})
srv.on('clientConnected', function(client){console.log(client)})
srv.on('clientMessage', function(msg){console.log(msg)})
srv.on('data', function(docs){console.log(docs)})
```
<a name="client"></a>
## Client

* You can define a new database at './db'. If needed, do something like './users' or './dashboards', ... .
* While putting some data in the db and no key is set, auto-key is active. When the key containes '@key' (single or multiple-times), this substring will be replaced with a auto-key.

```js
var tcpleveldb = require('tcpleveldb')

var port = 2222
var host = 'localhost'
var user = ''
var password = ''

var client = new tcpleveldb.Client(port, host, user, password)

// Define your own key which should be replaced by a unique id
client.key = '{mykey}'

// add some additional query data to handle it on the server-side-event 'clientMessage' or 'data'
client.addQuery = {topic : 'Hello'} 


//if key is empty it will create one like c10zlYDlf
client.put('./persons', {value : { name : 'Superman', city: 'Metropolis'}}, function(err, key){
    console.log(err, key)
    //Output: null, 'c10zlYDlf'

    client.get('./persons', key, function(err, doc){
        console.log(err, doc) 
        //Output: null, { key: 'c10zlYDlf', value: { name: 'Superman', city: 'Metropolis' } }
    })
})

client.put('./db', { key : 'PeterPan', value : { name : 'Peter Pan', city: 'Neverland'}}, function(err, key){
    console.log(err, key)

    client.get('./db', 'PeterPan', function(err, doc){
        console.log(err, doc) 
        //Output: null, { key: 'PeterPan', value: { name: 'Peter Pan', city: 'Neverland' } }
    })
})

client.get('./db', 'WhereIsMyKey', function(err, doc){
    console.log(err, doc) 
    // Output: NotFoundError: Key not found in database [WhereIsMyKey], { key: 'WhereIsMyKey' }
})



client.del('./db', 'Peter Pan', function(err, key){
    console.log(err, key) 
    // Output: null, Peter Pan
})


var batches = [
    { type: 'del', key: 'father' },
    { type: 'put', key: 'yamigr', value: 'https://github.com/yamigr' },
    { type: 'put', key: 'obj:1', value: { a : 123, b: 'abc', c :'Hello World!'} },
    { type: 'put', key: 'obj:2', value: { a : 1, b: 'xyz', c :'Hello World!'} }
]

client.batch('./db', batches, function(err, numberOfBatches){
    console.log(err, numberOfBatches) 
    // Output: null, 4
})


// ops : gte:'key', lte: 'key~', reverse, limit, lt, gt, start, end for timeseries...*/
// For api options details see https://www.npmjs.com/package/leveldb. Thx :)
// For gte and lte query see https://medium.com/@kevinsimper/how-to-get-range-of-keys-in-leveldb-and-how-gt-and-lt-works-29a8f1e11782 Thx :)
client.stream('./db', { /* ops */}, function(err, docs){
    console.log(err, docs) 
    // Output: null, [ { key: 'yamigr', value: 'https://github.com/yamigr' }, ...]
})
client.stream('./db', function(err, docs){
    console.log(err, docs) 
    // without options you can stream the whole database
})

// stream all keys
client.keys('./db', { /* ops */}, function(err, docs){
    console.log(err, docs) 
    // Output: null, [ key1, ...]
})

// stream all keys
client.values('./db', { /* ops */}, function(err, docs){
    console.log(err, docs) 
    // Output: null, [ value1, ...]
})

client.count('./db', {gte : 'obj:', lte : 'obj:~' /*ops*/}, function(err, numb){
    console.log(err, numb) 
    // Output: null, 2
})
client.count('./db', function(err, docs){
    console.log(err, docs) 
    // without options you can count the whole database
})

/* mongodb like array-filtering. a huge thx to davidtpate, https://www.npmjs.com/package/bloc 
   the array to filter looks like [ { key : '', value : '' or object }, ....].
   a single entry with object as value looks like {key : 'test', value: { test : 'mongooselike', obj : { nested : 'filter'}}}
   the nested filter looks like { 'value.obj.nested' : { $in : ['filter'] }}
   in the example bellow, the value is a string
*/
client.filter('./db', { value : { $in : ['Special key', 'Whoooooooop']}}, function(err, docs){
    console.log(err, docs) 
    // Output: null [ { key: '-Gj_-CweyG', value: 'Special key' },
    //                { key: 'test', value: 'Whoooooooop' } ]
})


client.update('./db', { key : 'obj:1', value: {b : 'Whooooooooop'}}, function(err, key){
    console.log(err, key) 
    // Output: null, obj:1

    client.get('./db', key, function(err, doc){
        console.log(err, doc) 
        // Output: null, { key: 'obj:1', value: { a: 123, b: 'Whooooooooop', c: 'Hello World!' } }
    })
})

// use the query method the use all query-options in one method
client.query('./db', 'put', { key : 'querytest', value : 'hello'}, function(docs){
    if(docs.err){
        // handle err
    }
    else{
        client.query('./db', 'get', { key : 'querytest'}, function(docs){
                // docs { err : null, data : {key: 'querytest', value: 'hello'}}
        })
    }
})

client.on('error', function(err){console.log(err)})
client.on('connect', function(status){console.log(status)})
client.on('close', function(status){console.log(status)})
client.on('data', function(err, data){console.log(data)})
```

## Authors

* **Yannick Grund** - *Initial work* - [yamigr](https://github.com/yamigr)


## License

This project is licensed under the MIT License - see the [LICENSE.md](lib/LICENSE.md) file for details

