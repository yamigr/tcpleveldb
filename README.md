# tcpleveldb

> A node-js-tcp database environment with server and client on top of the leveldb.

## Installing
```js
npm install tcpleveldb --save
```
## Server

```js
var tcpleveldb = require('tcpleveldb')
var srv = new tcpleveldb.Server(2222, 'localhost') // or keep it empty default port: 2222, host: 'localhost'
srv.listen() 

//you can use some socket-events if needed
srv.on('end', function(msg){console.log(msg)})
srv.on('close', function(client){console.log(client)})
srv.on('error', function(err){console.log(err)})
srv.on('clientConnected', function(client){console.log(client)})
srv.on('clientMessage', function(msg){console.log(msg)})
srv.on('database', function(docs){console.log(docs)})
```

## Client

```js
var tcpleveldb = require('tcpleveldb')
var client = new tcpleveldb.Client(2222, 'localhost')  // or keep it empty default port: 2222, host: 'localhost'

var data = { name : 'Peter Pan', city: 'Neverland'}

//if key is empty it will create one
client.put('./db', { key : 'PeterPan', value : data}, function(err){
    console.log('bp1:', err) //bp1: null
    client.get('./db', 'PeterPan', function(err, doc){
        console.log('bp2:', err, doc) //bp2: null, { key: 'PeterPan', value: { name: 'Peter Pan', city: 'Neverland' } }
    })
})

client.del('./db', 'Hello', function(err, id){
    console.log('bp3:', err, id) //bp3: null, Hello
})

// var ops = { gte:'', lte: String.fromCharCode(this.gte.charCodeAt(0) + 1) /*, reverse,limit,lt,gt,...*/
// For API options details see https://www.npmjs.com/package/leveldb. Thx :)
client.stream('./db', {  /* ops */}, function(err, docs){
    console.log('bp4:', err, docs) // bp4: null, [ { key: 'key_1000', value: 'krzkl' }, ...]
})

var batches = [
    { type: 'del', key: 'father' },
    { type: 'put', key: 'name', value: 'Yuri Irsenovich Kim' },
    { type: 'put', key: 'occu', value: { a : 123, b: 'abc', c :'Hello World!'} },
    { type: 'put', key: 'babu', value: { a : 1, b: 'xyz', c :'Hello World!'} }
]

client.batch('./db', batches, function(err, numberOfBatches){
    console.log('bp5:', err, numberOfBatches) //bp5: null, 5
})

client.count('./db', {gte : 'key_1000~', lte : 'key_2000~' /*ops*/}, function(err, numb){
    console.log('bp6:', err, numb) // bp6: null, 1000000
})

client.filter('./db', 'Yuri Irsenovich Kim', function(err, docs){
    console.log('bp7:', err, docs) //bp7: null, [ { key: 'name', value: 'Yuri Irsenovich Kim' } ]
})

client.on('error', function(err){console.log(err)})
client.on('connect', function(status){console.log(status)})
client.on('close', function(status){console.log(status)})
client.on('data', function(err, data){console.log(data)})
```

## Authors

* **Yannick Grund** - *Initial work* - [yamigr](https://github.com/yamigr)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

