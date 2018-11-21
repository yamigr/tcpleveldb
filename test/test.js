var assert = require('assert');
var tcpleveldb = require('../lib/main')
var fs = require('fs')
var port = 2222
var host = 'localhost'
var user = ''
var password = ''

var srv = new tcpleveldb.Server(port, host, user, password)
var client

var filtekey
var starter = false


const path = require('path');

const directory = './test';

describe('Server', function(done) {
    before(function () {
        srv.listen();
    });

    describe('#Client connect', function() {
        it('connect client', function(done) {
            client = new tcpleveldb.Client(2222, 'localhost', '', '')
            client.stream('./test/test', {}, function(err, docs){
                assert.equal(err, null);
                var batcher = []
                for(let doc in docs){
                    batcher.push({type: 'del', key: docs[doc].key})
                }
                client.batch('./test/test', batcher, function(err, docs){
                    done(err)
                })

            })
        });
    });

    describe('#Query', function() {
        it('put data in the database', function(done) {
            client.put('./test/test', {key : 'test', value : 'Test value'}, function(err, docs){
                assert.equal(err, null);
                done(err)
            })
        });

        it('put data with special key', function(done) {

            client.key = '{key}'
            client.put('./test/test', {key : client.key, value : 'Special key'}, function(err, docs){
                assert.notEqual(docs.key, client.key);
                done(err)
            })
        });


        it('get the data from the database', function(done) {
            client.get('./test/test', 'test', function(err, docs){
                assert.equal(err, null);
                done(err)
            })
        });

        it('batch multiple data into the database', function(done) {
            var batcher = []
            for(i = 0; i < 10; i++){
                filterkey = new Date().getTime() * Math.random()
                batcher.push({type: 'put', key: 'time:' + filterkey, value : 'Hello World ' + filterkey})
            }
            client.batch('./test/test', batcher, function(err, docs){
                assert.equal(err, null);
                done(err)
            })
        });

        it('stream the database with options', function(done) {
            client.stream('./test/test', { gte: 'time:', lte: 'time:~'}, function(err, docs){
                assert.equal(docs.length, 10);
                done(err)
            })
        });

        it('stream the whole database whithout options', function(done) {
            client.stream('./test/test', function(err, docs){
                assert.equal(err, null);
                done(err)
            })
        });

        it('count the datasets in database with options', function(done) {
            client.count('./test/test', { gte: 'time:', lte: 'time:~'}, function(err, numb){
                assert.equal(numb, 10);
                done(err)
            })
        });

        it('count all datasets in database whithout options', function(done) {
            client.count('./test/test', function(err, numb){
                assert.equal(numb, 12);
                done(err)
            })
        });

        it('update a dataset in the database', function(done) {
            client.update('./test/test', {key : 'test', value: 'Whoooooooop'}, function(err, id){
                assert.equal(err, null);
                done(err)
            })
        });

        it('filter a dataset by value', function(done) {
            client.filter('./test/test', 'Hello World ' + filterkey, function(err, docs){
                assert.equal(err, null);
                done(err)
            })
        });

        it('delete a dataset', function(done) {
            client.del('./test/test', 'test', function(err, id){
                assert.equal(err, null);
                done(err)
            })
        });  

        it('add some special query keys to the client query', function(done) {
            starter = true
            client.addQuery = { hello : 'world'}
            
            client.get('./test/test', 'test', function(err, id){

            })
            srv.on('clientMessage', function(data){
                if(starter){
                    starter = false
                    assert.equal(data.hello, 'world');
                    done()
                }

            })
        });  

        it('test method query', function(done) {

            client.query('./test/test', 'put', { key : 'querytest', value : 'hello'}, function(docs){

                if(docs.err){
                    assert.equal(docs.err, null);
                    done()
                }
                else{
                    client.query('./test/test', 'get', { key : 'querytest'}, function(docs){
                        assert.equal(docs.data.value, 'hello');
                        client.query('./test/test', 'del', { key : 'querytest'}, function(docs){
                            assert.equal(docs.data, 'querytest');
                            done()
                        })
                    })
                }

            })

        });  

        it('test done', function(done) {
            process.exit()
        });       
    
    });
});
  