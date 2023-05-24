module.exports = function(RED) {
  'use strict';
  const fronius = require('node-fronius-solar');

  /**
  * fronius inverter node
  * @constructor
  * @param {map} config nodered configuration item
  */
  function FroniusInverter(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    node.host = config.host;
    node.port = config.port;
    node.apiversion = config.apiversion;
  }

  RED.nodes.registerType('fronius-inverter', FroniusInverter);

  /**
   * fronius control node
   * @constructor
   * @param {map} config nodered configuration item
   */
  function FroniusControl(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.name = config.name;
    node.deviceid = config.deviceid;
    node.inverter = RED.nodes.getNode(config.inverter);
    node.querytype = config.querytype;
    node.options = {
      host: node.inverter.host,
      port: node.inverter.port,
      deviceId: node.deviceid,
      version: node.inverter.apiversion,
    };

    node.on('input', function(msg) {
      node.processCommand(msg);
    });
  }

  FroniusControl.prototype.setNodeStatus = function(color, text, shape) {
    shape = shape || 'dot';
    this.status({
      fill: color,
      shape: shape,
      text: text,
    });
  };

  FroniusControl.prototype.isValidHead = function(json) {
    return (json.Head.Status.Code === 0);
  };
  FroniusControl.prototype.processCommand = function(msg) {
    msg.payload = {};
    const node = this;
    if (node.querytype === 'inverter') {
      fronius.GetInverterRealtimeData(node.options).then(function(json) { // eslint-disable-line
        if (!node.isValidHead(json)) {
          node.setNodeStatus('orange', json.Head.Status.UserMessage);
          return;
        }
        msg.payload = json.Body.Data;
        node.send(msg);
      }).catch(function(e) {
        node.setNodeStatus('red', e);
      });
    } else if (node.querytype === 'components') {
      fronius.GetComponentsData(node.options).then(function(json) { // eslint-disable-line
        if (!node.isValidHead(json)) {
          node.setNodeStatus('orange', json.Head.Status.UserMessage);
          return;
        }
        msg.payload = json.Body.Data;
        node.send(msg);
      }).catch(function(e) {
        setNodeStatus('red', e);
      });
    } else if (node.querytype === 'powerflow') {
      fronius.GetPowerFlowRealtimeData(node.options).then(function(json) { // eslint-disable-line
        if (!node.isValidHead(json)) {
          node.setNodeStatus('orange', json.Head.Status.UserMessage);
          return;
        }
        msg.payload = json.Body.Data;
        node.send(msg);
      }).catch(function(e) {
        node.setNodeStatus('red', e);
      });
    } else if (node.querytype === 'storage') {
      fronius.GetStorageRealtimeData(node.options).then(function(json) { // eslint-disable-line
        if (!node.isValidHead(json)) {
          node.setNodeStatus('orange', json.Head.Status.UserMessage);
          return;
        }
        msg.payload = json.Body.Data;
        node.send(msg);
      }).catch(function(e) {
        node.setNodeStatus('red', e);
      });
    } else if (node.querytype === 'powermeter') {
      fronius.GetMeterRealtimeData(node.options).then(function(json) { // eslint-disable-line
        if (!node.isValidHead(json)) {
          node.setNodeStatus('orange', json.Head.Status.UserMessage);
          return;
        }
        msg.payload = json.Body.Data;
        node.send(msg);
      }).catch(function(e) {
        node.setNodeStatus('red', e);
      });
    } else {
      node.setNodeStatus('orange', 'could not process query of ' +
        node.querytype);
    }
  };

  RED.nodes.registerType('fronius-control', FroniusControl);
};
