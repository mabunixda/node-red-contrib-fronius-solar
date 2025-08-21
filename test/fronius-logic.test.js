const should = require("should");
const logic = require("../fronius/fronius-logic");

describe("Fronius Logic", function () {
  it("should validate head correctly", function () {
    should(logic.isValidHead({ Head: { Status: { Code: 0 } } })).be.true();
    should(logic.isValidHead({ Head: { Status: { Code: 1 } } })).be.false();
    should(logic.isValidHead({})).be.false();
    should(logic.isValidHead(null)).be.false();
    should(logic.isValidHead(undefined)).be.false();
    should(logic.isValidHead({ Head: null })).be.false();
    should(logic.isValidHead({ Head: { Status: null } })).be.false();
    should(logic.isValidHead({ Head: { Status: {} } })).be.false();
  });

  it("should extract payload correctly", function () {
    logic
      .extractPayload({ Body: { Data: { foo: 1 } } })
      .should.deepEqual({ foo: 1 });
    logic.extractPayload({}).should.deepEqual({});
    logic.extractPayload({ Body: {} }).should.deepEqual({});
    logic.extractPayload(null).should.deepEqual({});
    logic.extractPayload(undefined).should.deepEqual({});
    logic.extractPayload({ Body: null }).should.deepEqual({});
    logic.extractPayload({ Body: { Data: null } }).should.deepEqual({});
  });

  it("should handle complex nested data structures", function () {
    const complexData = {
      Body: {
        Data: {
          inverter: {
            power: 1000,
            status: "active",
            details: {
              temp: 25,
              efficiency: 0.95,
            },
          },
          meter: {
            reading: 12345,
            phases: [1, 2, 3],
          },
        },
      },
    };
    logic.extractPayload(complexData).should.deepEqual(complexData.Body.Data);
  });

  it("should handle arrays in data", function () {
    const arrayData = {
      Body: {
        Data: [
          { id: 1, value: "test1" },
          { id: 2, value: "test2" },
        ],
      },
    };
    logic.extractPayload(arrayData).should.deepEqual(arrayData.Body.Data);
  });

  it("should handle all valid status codes", function () {
    const validCodes = [0];
    const invalidCodes = [-1, 1, 2, 3, 999];

    validCodes.forEach((code) => {
      logic.isValidHead({ Head: { Status: { Code: code } } }).should.be.true();
    });

    invalidCodes.forEach((code) => {
      logic.isValidHead({ Head: { Status: { Code: code } } }).should.be.false();
    });
  });

  it("should handle edge cases in status validation", function () {
    // Extra properties shouldn't affect validation
    logic
      .isValidHead({
        Head: {
          Status: { Code: 0, extraProp: true },
          Version: "1.0",
        },
        Extra: "data",
      })
      .should.be.true();

    // Status code as string should be handled
    logic
      .isValidHead({
        Head: { Status: { Code: "0" } },
      })
      .should.be.false();

    // Status code must be exactly 0
    logic
      .isValidHead({
        Head: { Status: { Code: 0.0 } },
      })
      .should.be.true();

    logic
      .isValidHead({
        Head: { Status: { Code: -0 } },
      })
      .should.be.true();
  });
});
