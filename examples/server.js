var tcpleveldb = require('../lib/main')
var srv = new tcpleveldb.Server(2222, 'localhost') // or keep it empty default port: 2222, host: 'localhost'
srv.listen() 


//you can use some socket-events if needed
srv.on('end', function(msg){console.log(msg)})
srv.on('close', function(client){console.log(client)})
srv.on('error', function(err){console.log(err)})
srv.on('clientConnected', function(client){console.log(client)})
srv.on('clientMessage', function(msg){console.log(msg)})
srv.on('database', function(docs){console.log(docs)})
