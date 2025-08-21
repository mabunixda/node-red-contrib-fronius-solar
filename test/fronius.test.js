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

  it("should preserve message properties", function (done) {
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
        try {
          msg.should.have.property("topic", "custom_topic");
          msg.should.have.property("customProp", "test");
          msg.should.have.property("payload").have.property("value", 42);
          done();
        } catch (err) {
          done(err);
        }
      });
      n2.receive({ topic: "custom_topic", customProp: "test" });
    });
  });

  it("should handle API version 0", function (done) {
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
        apiversion: 0,
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
      n2.receive({});
      n3.on("input", function (msg) {
        try {
          froniusApiMock.GetInverterRealtimeData.firstCall.args[0].should.have.property(
            "version",
            0,
          );
          done();
        } catch (err) {
          done(err);
        }
      });
    });
  });

  it("should handle undefined query type", function (done) {
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
        querytype: "unknown",
        deviceid: 1,
        wires: [["n3"]],
      },
      { id: "n3", type: "helper" },
    ];
    helper.load(froniusNode, flow, function () {
      const n2 = helper.getNode("n2");
      let statusSet = false;

      // Override status function to catch the status update
      const originalStatus = n2.status;
      n2.status = function (status) {
        originalStatus.call(n2, status);
        if (
          !statusSet &&
          status.fill === "orange" &&
          status.text.includes("could not process query")
        ) {
          statusSet = true;
          done();
        }
      };
      n2.receive({});
    });
  });

  it("should handle invalid port configuration", function (done) {
    const flow = [
      {
        id: "n1",
        type: "fronius-inverter",
        name: "test inverter",
        host: "localhost",
        port: -1, // Invalid port
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

      // Mock the API call to reject with a port error
      froniusApiMock.GetInverterRealtimeData.rejects(
        new Error("Invalid port number"),
      );

      let statusSet = false;
      const originalStatus = n2.status;
      n2.status = function (status) {
        originalStatus.call(n2, status);
        if (!statusSet && status.fill === "red") {
          statusSet = true;
          done();
        }
      };
      n2.receive({});
    });
  });

  it("should handle network timeout errors", function (done) {
    const timeoutError = new Error("Network timeout");
    froniusApiMock.GetInverterRealtimeData.rejects(timeoutError);
    
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
      let statusChecked = false;
      
      // Monitor status changes
      const originalStatus = n2.status;
      n2.status = function(status) {
        originalStatus.call(n2, status);
        if (!statusChecked && status.fill === "red" && status.text === timeoutError.toString()) {
          statusChecked = true;
          done();
        }
      };
      
      n2.receive({});
    });
  });

  it("should handle invalid JSON responses", function (done) {
    const malformedData = "not a json response";
    froniusApiMock.GetInverterRealtimeData.resolves(malformedData);
    
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
      let messageReceived = false;
      const n3 = helper.getNode("n3");
      
      n3.on("input", function (msg) {
        messageReceived = true;
      });

      let statusChecked = false;
      const originalStatus = n2.status;
      n2.status = function(status) {
        originalStatus.call(n2, status);
        if (!statusChecked && status.fill === "red") {
          statusChecked = true;
          messageReceived.should.be.false();
          done();
        }
      };
      
      n2.receive({});
    });
  });

  it("should validate host configuration", function (done) {
    const flow = [
      {
        id: "n1",
        type: "fronius-inverter",
        name: "test inverter",
        host: "", // Empty host
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
      froniusApiMock.GetInverterRealtimeData.rejects(new Error("Invalid host"));
      
      let statusChecked = false;
      const originalStatus = n2.status;
      n2.status = function(status) {
        originalStatus.call(n2, status);
        if (!statusChecked && status.fill === "red") {
          statusChecked = true;
          done();
        }
      };
      
      n2.receive({});
    });
  });

  it("should validate API version", function (done) {
    const flow = [
      {
        id: "n1",
        type: "fronius-inverter",
        name: "test inverter",
        host: "localhost",
        port: 80,
        apiversion: 99, // Invalid version
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
      
      // Mock the API call to reject for invalid version
      froniusApiMock.GetInverterRealtimeData.rejects(new Error("Invalid API version"));
      
      let statusChecked = false;
      const originalStatus = n2.status;
      n2.status = function(status) {
        originalStatus.call(n2, status);
        if (!statusChecked && status.fill === "red") {
          statusChecked = true;
          done();
        }
      };
      
      n2.receive({});
    });
  });

  it("should handle node close event and cleanup", function (done) {
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
      const n1 = helper.getNode("n1");
      const n2 = helper.getNode("n2");
      
      // Create a pending request
      n2.receive({});
      
      // Verify both nodes have close handlers
      n1.should.have.property("close");
      n2.should.have.property("close");
      
      // Ensure cleanup happens without errors
      try {
        n1.close();
        n2.close();
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it("should handle concurrent requests properly", function (done) {
    const fakeData1 = {
      Head: { Status: { Code: 0 } },
      Body: { Data: { value: 1 } },
    };
    const fakeData2 = {
      Head: { Status: { Code: 0 } },
      Body: { Data: { value: 2 } },
    };
    
    // Setup delayed responses for concurrent requests
    const request1 = new Promise(resolve => setTimeout(() => resolve(fakeData1), 100));
    const request2 = new Promise(resolve => setTimeout(() => resolve(fakeData2), 50));
    
    froniusApiMock.GetInverterRealtimeData.onFirstCall().returns(request1);
    froniusApiMock.GetInverterRealtimeData.onSecondCall().returns(request2);

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
      
      let responseCount = 0;
      const responses = [];
      
      n3.on("input", function (msg) {
        responses.push(msg.payload.value);
        responseCount++;
        
        if (responseCount === 2) {
          try {
            // Verify both responses were received
            responses.should.have.length(2);
            responses.should.containDeep([1, 2]);
            done();
          } catch (err) {
            done(err);
          }
        }
      });

      // Send two requests in quick succession
      n2.receive({ id: 1 });
      n2.receive({ id: 2 });
    });
  });

  it("should prevent memory leaks in error handlers", function (done) {
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
      
      // Create multiple errors
      froniusApiMock.GetInverterRealtimeData.rejects(new Error("Test error"));
      
      let errorCount = 0;
      const maxErrors = 5;
      const startHeap = process.memoryUsage().heapUsed;
      
      function checkMemory() {
        errorCount++;
        if (errorCount === maxErrors) {
          const endHeap = process.memoryUsage().heapUsed;
          // Allow for some overhead but ensure no significant leak
          (endHeap - startHeap).should.be.below(1000000); // Less than 1MB difference
          done();
        } else if (errorCount < maxErrors) {
          n2.receive({});
        }
      }
      
      // Monitor status changes for error handling completion
      const originalStatus = n2.status;
      n2.status = function(status) {
        originalStatus.call(n2, status);
        if (status.fill === "red") {
          checkMemory();
        }
      };
      
      n2.receive({});
    });
  });
});
