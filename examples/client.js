var tcpleveldb = require('../lib/main')

var port = 2222
var host = 'localhost'
var user = ''
var password = ''

var client = new tcpleveldb.Client(port, host, user, password)


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


// var ops = { gte:'key', lte: 'key~' /*, reverse, limit, lt, gt, start, end...*/
// For API options details see https://www.npmjs.com/package/leveldb. Thx :)
// For gte and lte query see https://medium.com/@kevinsimper/how-to-get-range-of-keys-in-leveldb-and-how-gt-and-lt-works-29a8f1e11782 Thx :)
client.stream('./db', { /* ops */}, function(err, docs){
    console.log(err, docs) 
    // Output: null, [ { key: 'yamigr', value: 'https://github.com/yamigr' }, ...]
})


client.count('./db', {gte : 'obj:', lte : 'obj:~' /*ops*/}, function(err, numb){
    console.log(err, numb) 
    // Output: null, 2
})


client.filter('./db', {b : 'abc'}, function(err, docs){
    console.log(err, docs) 
    // Output: null, [ { key: 'obj:1', value: { a: 123, b: 'abc', c: 'Hello World!' } } ]
})


client.update('./db', { key : 'obj:1', value: {b : 'Whooooooooop'}}, function(err, key){
    console.log(err, key) 
    // Output: null, obj:1

    client.get('./db', key, function(err, doc){
        console.log(err, doc) 
        // Output: null, { key: 'obj:1', value: { a: 123, b: 'Whooooooooop', c: 'Hello World!' } }
    })
})


client.on('error', function(err){console.log(err)})
client.on('connect', function(status){console.log(status)})
client.on('close', function(status){console.log(status)})
client.on('data', function(err, data){console.log(data)})