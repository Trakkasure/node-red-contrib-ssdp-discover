module.exports = function(RED) {
	
	var dgram = require('dgram');

	function ssdp(config){
		RED.nodes.createNode(this,config);
		this.address = config.address;
		this.port = 1900;
		var socket = dgram.createSocket('udp4');
		var ssdp = this;

		socket.on("error", function (err) {
            if ((err.code == "EACCES") && (ssdp.port < 1024)) {
                ssdp.error("UDP access error, you may need root access for port "+ssdp.port);
            } else {
                ssdp.error("UDP error : "+err.code);
            }
            socket.close();
        });

        socket.on('message',function(msg, remote){
        	var str = msg.toString();
    		var arr = str.match(/[^\r\n]+/g);
    		var newMsq={};
    		newMsq.payload={};
    		for (var i = 0; i < arr.length; ++i){
		        if (i==0){
		                newMsq.topic=arr[i];
		        }else{
		                var tem = arr[i].split(/:(.+)?/);
		                if (typeof(tem[1])=='string'){tem[1]=tem[1].trim();}
		                newMsq.payload[tem[0]]=tem[1];
		        };
		    };
        	ssdp.emit('response', newMsq);
        });

		ssdp.on('close', function(){
			socket.close();
		})

		socket.bind(ssdp.port, function(){
			socket.setMulticastTTL(128);
			socket.addMembership('239.255.255.250', ssdp.address);
		});

		ssdp.send = function(st){
			var message = new Buffer(
				"M-SEARCH * HTTP/1.1\r\n" +
				"HOST: 239.255.255.250:1900\r\n" +
				"MAN: \"ssdp:discover\"\r\n" +
				"ST: "+st+"\r\n" + // Essential, used by the client to specify what they want to discover, eg 'ST:ge:fridge'
				"MX: 3\r\n" + // 1 second to respond (but they all respond immediately?)
				"\r\n"
			);
			socket.send(message, 0, message.length, 1900, "239.255.255.250")
		}

	}
	RED.nodes.registerType("ssdp",ssdp);


	function discovery(config) {
	    RED.nodes.createNode(this, config);
	    ssdp = RED.nodes.getNode(config.ssdp);
	    this.st=config.st;
	    var node = this;
	    ssdp.on('response',function(msg){
	    	node.send(msg);
	    });
	    ssdp.send(node.st);

	}
  	RED.nodes.registerType("ssdp-discovery",discovery);
}
