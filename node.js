const request = require('request')
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto')
const sign = require('jsonwebtoken').sign
const queryEncode = require("querystring").encode

module.exports = function (RED) {
    function FunctionNode(n) {
        RED.nodes.createNode(this, n);
        if (RED.nodes.getNode(n.creds)){
            this.accessKey = RED.nodes.getNode(n.creds).credentials.accessKey;
            this.secretKey = RED.nodes.getNode(n.creds).credentials.secretKey;
        } else {
            this.accessKey = "";
            this.secretKey = "";
        }
        var node = this;
        this.name = n.name;
        node.params = {};

        for (var key in n) {
            if (key !== 'x' && key !== 'y' && key !== 'z' && key !== 'creds' && key !== 'id'&& key !== 'type' && key !== 'wires' && key !== 'name'
                && n[key] !== ''&& typeof n[key] !== 'undefined') {
                if(key === 'market'){
                    node.params.currency = n[key];
                }
                node.params[key] = n[key] || "";

            }
        }

        this.on('input', function (msg) {
            if(msg.params){
                for (var i in msg.params) {
                    if (i !== 'req' && i !== 'res' && i !== 'payload' && i !== 'send' && i !== '_msgid' && i !== 'topic') {
                        node.params[i] = node.params[i] || msg.params[i];
                    }
                }
            }

            var url = 'https://api.upbit.com/v1';
            if(node.params.category){
                url += '/' + node.params.category;
            }
            if(node.params.api){
                url += '/' + node.params.api;
            }


            const options = {};
            const query = queryEncode(node.params)
            const hash = crypto.createHash('sha512')
            const queryHash = hash.update(query, 'utf-8').digest('hex')
            const payload = {
                access_key: node.accessKey,
                nonce: uuidv4(),
                query_hash: queryHash,
                query_hash_alg: 'SHA512',
            }
            const token = sign(payload, node.secretKey)

            delete node.params.params;
            // node.error(url);
            node.error(node.params);

            if(node.params.category === 'accounts'){
                options.method = "GET";
                url += '?' + query;
            }else if(node.params.ord_type | node.params.api === 'coin'| node.params.api === 'krw'| node.params.api === 'generate_coin_address'){
                options.method = "POST"; // 주문하기 (주문 타입),코인 출금,원화 출금,입금 주소 생성 요청
                options.json = node.params;
            }else if(node.params.category === 'order' && node.params.uuid && node.params.identifier){
                options.method = "DELETE"; // 주문접수취소
                options.json = node.params;
                url += '?' + query;
            }else{
                options.method = "GET";
                url += '?' + query;
            }
            options.url = url;
            options.headers = {Authorization: `Bearer ${token}`};
            node.error(url);

            request(options, (error, response, body) => {
                if(error) {
                    msg.payload = error;
                    node.send(msg);
                }

                var rgResultDecode = JSON.parse(body);
                msg.payload = rgResultDecode;
                node.send(msg);
            })
        });
    }

    RED.nodes.registerType("upbit", FunctionNode, {
        credentials: {
            accessKey: {type:"text"},
            secretKey: {type:"text"}
        }
    });

    function upbitApiKey(n){
        RED.nodes.createNode(this, n);
        this.accessKey = n.accessKey;
        this.secretKey = n.secretKey;
    }

    RED.nodes.registerType("upbitApiKey", upbitApiKey,{
        credentials: {
            accessKey: {type:"text"},
            secretKey: {type:"text"}
        }
    });
};

