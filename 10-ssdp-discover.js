module.exports = function(RED) {
	
	var dgram = require('dgram');

	function ssdp(config){
		RED.nodes.createNode(this,config);
		this.address = config.address;
		this.port = 1900;
		var socket = dgram.createSocket('udp4');
		var ssdp = this;
		var SEARCH = 'M-SEARCH * HTTP/1.1';
		var RESPONSE ='HTTP/1.1 200 OK';
		var NOTIFY='NOTIFY * HTTP/1.1';

		socket.on("error", function (err) {
            if ((err.code == "EACCES") && (ssdp.port < 1024)) {
                ssdp.error("UDP access error, you may need root access for port "+ssdp.port);
            } else {
                ssdp.error("UDP error : "+err.code);
            }
            socket.close();
        });

        socket.on('message',function(msg, remote){
    		var arr = msg.toString().match(/[^\r\n]+/g);
    		if (arr[0].trim()==SEARCH){
    			return;
    		}
    		var newMsq={};
    		newMsq.payload={};
    		for (var i = 1; i < arr.length; ++i){
                var tem = arr[i].split(/:(.+)?/);
                if (typeof(tem[1])=='string'){tem[1]=tem[1].trim();}
                newMsq.payload[tem[0].toLowerCase()]=tem[1];
		    };
    		if (arr[0].trim()==RESPONSE) {
    			newMsq.topic = 'ssdp:alive';
    			newMsq.payload.nt = newMsq.payload.st;
    		} else {
    			newMsq.topic = newMsq.payload.nts;
    		};
    		ssdp.emit('response', newMsq);
        });

		ssdp.on('close', function(){
			socket.close();
			ssdp.log('Stop listening SSDP on '+ssdp.address+":"+ssdp.port);
		})

		socket.bind(ssdp.port, ssdp.address, function(){
			socket.setMulticastTTL(128);
			socket.addMembership('239.255.255.250', ssdp.address);
			ssdp.log('Start listening SSDP on '+ssdp.address+":"+ssdp.port);
		});

		ssdp.discover = function(st){
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

	function discover(config) {
	    RED.nodes.createNode(this, config);
	    ssdp = RED.nodes.getNode(config.ssdp);
	    this.st=config.st;
	    this.atstart=config.atstart;
	    this.repeat=config.repeat*1000;
	    var node = this;
	    ssdp.on('response',function(msg){
	    	if (node.st == '' || node.st == 'ssdp:all'){
	    		node.send(msg);
	    	}else{
	    		if (msg.payload.nt == node.st){
	    			node.send(msg);	
	    		}
	    	};
	    });
	    if (node.atstart){
	    	var st = node.st || 'ssdp:all';
	    	ssdp.discover(st);
	    };
	    if (node.repeat && !isNaN(node.repeat) && node.repeat > 0){
	    	node.interval_id = setInterval( function() {
	    			var st = node.st || 'ssdp:all';
	    			ssdp.discover(st);
            	}, node.repeat );
	    }
	    node.on('close', function(){
			if (node.interval_id != null) {
            	clearInterval(node.interval_id);
        	} 
		})
	}
  	RED.nodes.registerType("ssdp-discover",discover);
}
