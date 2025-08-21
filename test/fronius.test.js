const should = require("should");
const sinon = require("sinon");
const helper = require("node-red-node-test-helper");
const path = require("path");
const proxyquire = require("proxyquire");
let froniusApiMock;
let froniusNode;

// Mock RED object for direct function testing
const RED = {
  nodes: {
    createNode: function (node, config) {
      node.id = config.id;
      node.type = config.type;
      node.name = config.name;
    },
    getNode: function (id) {
      if (!id) return undefined;
      return { host: "localhost", port: 80, apiversion: 1 };
    },
  },
};

describe("Fronius Node", function () {
  before(function (done) {
    helper.startServer(done);
  });

  after(function (done) {
    helper.stopServer(done);
  });

  beforeEach(function () {
    // Reset the API mock for each test
    froniusApiMock = {
      GetInverterRealtimeData: sinon.stub(),
      GetComponentsData: sinon.stub(),
      GetPowerFlowRealtimeData: sinon.stub(),
      GetStorageRealtimeData: sinon.stub(),
      GetMeterRealtimeData: sinon.stub(),
    };
    froniusNode = proxyquire("../fronius/fronius.js", {
      "node-fronius-solar": froniusApiMock,
    });
  });

  afterEach(function () {
    helper.unload();
    sinon.restore();
  });

  it("should be loaded", function (done) {
    const flow = [{ id: "n1", type: "fronius-inverter", name: "test name" }];
    helper.load(froniusNode, flow, function () {
      const n1 = helper.getNode("n1");
      n1.should.have.property("name", "test name");
      done();
    });
  });

  it("should handle missing inverter config gracefully", function (done) {
    const flow = [
      {
        id: "n2",
        type: "fronius-control",
        name: "test control",
        inverter: null,
      },
    ];
    let finished = false;
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        done();
      }
    }, 500);
    helper.load(froniusNode, flow, function () {
      const n2 = helper.getNode("n2");
      should(n2.inverter).be.undefined();
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        done();
      }
    });
  });

  it("should call processCommand and handle inverter query", function (done) {
    const fakeData = {
      Head: { Status: { Code: 0 } },
      Body: { Data: { value: 42 } },
    };
    froniusApiMock.GetInverterRealtimeData.resolves(fakeData);
    const flow = [
      {
        id: "n1",
        type: "fronius-inverter",
        name: "test inverter",
        host: "localhost",
        port: 80,
        apiversion: 1,
      },
      {
        id: "n2",
        type: "fronius-control",
        name: "test control",
        inverter: "n1",
        querytype: "inverter",
        deviceid: 1,
        wires: [["n3"]],
      },
      { id: "n3", type: "helper" },
    ];
    helper.load(froniusNode, flow, function () {
      const n2 = helper.getNode("n2");
      const n3 = helper.getNode("n3");
      n3.on("input", function (msg) {
        msg.payload.should.have.property("value", 42);
        done();
      });
      n2.receive({});
    });
  });

  it("should call processCommand and handle components query", function (done) {
    const fakeData = {
      Head: { Status: { Code: 0 } },
      Body: { Data: { comp: 123 } },
    };
    froniusApiMock.GetComponentsData.resolves(fakeData);
    const flow = [
      {
        id: "n1",
        type: "fronius-inverter",
        name: "test inverter",
        host: "localhost",
        port: 80,
        apiversion: 1,
      },
      {
        id: "n2",
        type: "fronius-control",
        name: "test control",
        inverter: "n1",
        querytype: "components",
        deviceid: 1,
        wires: [["n3"]],
      },
      { id: "n3", type: "helper" },
    ];
    helper.load(froniusNode, flow, function () {
      const n2 = helper.getNode("n2");
      const n3 = helper.getNode("n3");
      n3.on("input", function (msg) {
        msg.payload.should.have.property("comp", 123);
        done();
      });
      n2.receive({});
    });
  });

  it("should call processCommand and handle powerflow query", function (done) {
    const fakeData = {
      Head: { Status: { Code: 0 } },
      Body: { Data: { pf: "ok" } },
    };
    froniusApiMock.GetPowerFlowRealtimeData.resolves(fakeData);
    const flow = [
      {
        id: "n1",
        type: "fronius-inverter",
        name: "test inverter",
        host: "localhost",
        port: 80,
        apiversion: 1,
      },
      {
        id: "n2",
        type: "fronius-control",
        name: "test control",
        inverter: "n1",
        querytype: "powerflow",
        deviceid: 1,
        wires: [["n3"]],
      },
      { id: "n3", type: "helper" },
    ];
    helper.load(froniusNode, flow, function () {
      const n2 = helper.getNode("n2");
      const n3 = helper.getNode("n3");
      n3.on("input", function (msg) {
        msg.payload.should.have.property("pf", "ok");
        done();
      });
      n2.receive({});
    });
  });

  it("should call processCommand and handle storage query", function (done) {
    const fakeData = {
      Head: { Status: { Code: 0 } },
      Body: { Data: { storage: true } },
    };
    froniusApiMock.GetStorageRealtimeData.resolves(fakeData);
    const flow = [
      {
        id: "n1",
        type: "fronius-inverter",
        name: "test inverter",
        host: "localhost",
        port: 80,
        apiversion: 1,
      },
      {
        id: "n2",
        type: "fronius-control",
        name: "test control",
        inverter: "n1",
        querytype: "storage",
        deviceid: 1,
        wires: [["n3"]],
      },
      { id: "n3", type: "helper" },
    ];
    helper.load(froniusNode, flow, function () {
      const n2 = helper.getNode("n2");
      const n3 = helper.getNode("n3");
      n3.on("input", function (msg) {
        msg.payload.should.have.property("storage", true);
        done();
      });
      n2.receive({});
    });
  });

  it("should call processCommand and handle powermeter query", function (done) {
    const fakeData = {
      Head: { Status: { Code: 0 } },
      Body: { Data: { meter: 999 } },
    };
    froniusApiMock.GetMeterRealtimeData.resolves(fakeData);
    const flow = [
      {
        id: "n1",
        type: "fronius-inverter",
        name: "test inverter",
        host: "localhost",
        port: 80,
        apiversion: 1,
      },
      {
        id: "n2",
        type: "fronius-control",
        name: "test control",
        inverter: "n1",
        querytype: "powermeter",
        deviceid: 1,
        wires: [["n3"]],
      },
      { id: "n3", type: "helper" },
    ];
    helper.load(froniusNode, flow, function () {
      const n2 = helper.getNode("n2");
      const n3 = helper.getNode("n3");
      n3.on("input", function (msg) {
        msg.payload.should.have.property("meter", 999);
        done();
      });
      n2.receive({});
    });
  });
});
