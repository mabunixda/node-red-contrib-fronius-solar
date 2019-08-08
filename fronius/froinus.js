module.exports = function (RED) {

  "use strict";
  const fronius = require('node-fronius-solar');



  function FroniusInverter(config) {
    RED.nodes.createNode(this, config);

    var node = this;
    node.host = config.host;
    node.port = config.port;
  }

  RED.nodes.registerType("fronius-inverter", FroniusInverter);

  function FroniusControl(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.name = config.name;
    node.deviceid = config.deviceid;
    node.inverter = RED.nodes.getNode(config.inverter);
    node.querytype = "realtime";
    node.options = {
      host: node.inverter.host,
      port: node.inverter.port,
      deviceId: node.deviceid,
      version: 1
    }

    node.on('input', function (msg) {
      node.handleInput(msg);
    });
  }

  FroniusControl.prototype.setNodeStatus = function (color, text, shape) {
    shape = shape || 'dot';
    this.status({
      fill: color,
      shape: shape,
      text: text
    });
  }

  FroniusControl.prototype.processCommand = function (msg) {

    msg.payload = {}
    var node = this;
    if (node.querytype === "realtime") {
      fronius.GetInverterRealtimeData(node.options).then(function (json) {

        msg.payload = json;
        node.send(msg);
      }).catch(function (e) {
        setConnectionStatusMsg("red", e)
      });
    } else if (node.querytype === "components") {
      fronius.GetComponentsData(options).then(function (json) {
        msg.payload = json;
        node.send(msg);
      }).catch(function (e) {
        setConnectionStatusMsg("red", e)
      });
    } else if (node.querytype === "powerflow") {
      fronius.GetPowerFlowRealtimeDataData(options).then(function (json) {
        msg.payload = json;
        node.send(msg);
      }).catch(function (e) {
        setConnectionStatusMsg("red", e);
      });
    } else {
      setConnectionStatusMsg("orange", "could not process query of " + node.querytype);
    }
  }

  RED.nodes.registerType("fronius-control", FroniusControl);


}