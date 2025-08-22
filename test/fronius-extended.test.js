const should = require("should");
const sinon = require("sinon");
const helper = require("node-red-node-test-helper");
const proxyquire = require("proxyquire");
let froniusApiMock;
let froniusNode;

describe("Fronius Node Extended Tests", function () {
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

  // Test debug output in setNodeStatus
  it("should output debug information when NODE_ENV is test", function (done) {
    const flow = [{
      id: "n1",
      type: "fronius-control",
      name: "test control",
      inverter: "inv1",
      querytype: "inverter"
    }];

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    
    const consoleLog = sinon.spy(console, "log");
    
    helper.load(froniusNode, flow, function () {
      const n1 = helper.getNode("n1");
      n1.setNodeStatus("red", "test message", "dot");
      
      consoleLog.should.have.been.calledWith("[setNodeStatus] color: red, text: test message, shape: dot");
      process.env.NODE_ENV = originalEnv;
      done();
    });
  });

  // Test error handling for each endpoint
  const endpoints = [
    { name: "inverter", method: "GetInverterRealtimeData" },
    { name: "components", method: "GetComponentsData" },
    { name: "powerflow", method: "GetPowerFlowRealtimeData" },
    { name: "storage", method: "GetStorageRealtimeData" },
    { name: "powermeter", method: "GetMeterRealtimeData" }
  ];

  endpoints.forEach(endpoint => {
    it(`should handle network errors for ${endpoint.name} endpoint`, function (done) {
      const networkError = new Error("Network timeout");
      froniusApiMock[endpoint.method].rejects(networkError);

      const flow = [{
        id: "n1",
        type: "fronius-control",
        name: "test control",
        inverter: "inv1",
        querytype: endpoint.name,
        wires: [["n2"]]
      }];

      helper.load(froniusNode, flow, function () {
        const n1 = helper.getNode("n1");
        const statusSpy = sinon.spy(n1, "setNodeStatus");

        n1.receive({});

        setTimeout(() => {
          statusSpy.should.have.been.calledWith("red", networkError);
          done();
        }, 10);
      });
    });

    it(`should handle malformed response for ${endpoint.name} endpoint`, function (done) {
      const malformedResponse = { 
        Head: { Status: { Code: 255, UserMessage: "Invalid data" } },
        Body: {}
      };
      froniusApiMock[endpoint.method].resolves(malformedResponse);

      const flow = [{
        id: "n1",
        type: "fronius-control",
        name: "test control",
        inverter: "inv1",
        querytype: endpoint.name,
        wires: [["n2"]]
      }];

      helper.load(froniusNode, flow, function () {
        const n1 = helper.getNode("n1");
        const statusSpy = sinon.spy(n1, "setNodeStatus");

        n1.receive({});

        setTimeout(() => {
          statusSpy.should.have.been.calledWith("orange", "Invalid data");
          done();
        }, 10);
      });
    });
  });
});
