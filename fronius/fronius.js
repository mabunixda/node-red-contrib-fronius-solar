module.exports = function (RED) {
  "use strict";
  const fronius = require("node-fronius-solar");

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

  RED.nodes.registerType("fronius-inverter", FroniusInverter);

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
    if (node.inverter) {
      node.options = {
        host: node.inverter.host,
        port: node.inverter.port,
        deviceId: node.deviceid,
        version: node.inverter.apiversion,
      };
    } else {
      node.options = {};
      // Always set status if inverter is missing
      node.status({
        fill: "red",
        shape: "ring",
        text: "Missing inverter config",
      });
    }

    node.on("input", function (msg) {
      node.processCommand(msg);
    });
  }

  FroniusControl.prototype.setNodeStatus = function (color, text, shape) {
    shape = shape || "dot";
    // Debug output for test reliability
    if (process.env.NODE_ENV === "test") {
      console.log(
        `[setNodeStatus] color: ${color}, text: ${text}, shape: ${shape}`,
      );
    }
    this.status({
      fill: color,
      shape: shape,
      text: text,
    });
  };

  const logic = require("./fronius-logic");
  FroniusControl.prototype.isValidHead = function (json) {
    return logic.isValidHead(json);
  };
  // Map of query types to their corresponding API methods
  const API_METHODS = {
    inverter: "GetInverterRealtimeData",
    components: "GetComponentsData",
    powerflow: "GetPowerFlowRealtimeData",
    storage: "GetStorageRealtimeData",
    powermeter: "GetMeterRealtimeData",
  };

  FroniusControl.prototype.processCommand = function (msg) {
    msg.payload = {};
    const node = this;

    const apiMethod = API_METHODS[node.querytype];
    if (!apiMethod) {
      node.setNodeStatus(
        "orange",
        `could not process query of ${node.querytype}`,
      );
      return;
    }

    fronius[apiMethod](node.options)
      .then((json) => {
        if (!node.isValidHead(json)) {
          node.setNodeStatus("orange", json.Head.Status.UserMessage);
          return;
        }
        msg.payload = json.Body.Data;
        node.send(msg);
      })
      .catch((error) => {
        node.setNodeStatus("red", error);
      });
  };

  RED.nodes.registerType("fronius-control", FroniusControl);
};
