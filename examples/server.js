var tcpleveldb = require('../lib/main')

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
srv.on('database', function(docs){console.log(docs)})
