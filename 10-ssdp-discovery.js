module.exports = function(RED) {

	function discovery(config) {
        RED.nodes.createNode(this,config);
        var node = this;

    }
    RED.nodes.registerType("ssdp-discovery",discovery);
}