const should = require('should');
const logic = require('../fronius/fronius-logic');

describe('Fronius Logic', function () {
    it('should validate head correctly', function () {
        should(logic.isValidHead({ Head: { Status: { Code: 0 } } })).be.true();
        should(logic.isValidHead({ Head: { Status: { Code: 1 } } })).be.false();
        should(logic.isValidHead({})).be.false();
        should(logic.isValidHead(null)).be.false();
        should(logic.isValidHead(undefined)).be.false();
        should(logic.isValidHead({ Head: null })).be.false();
        should(logic.isValidHead({ Head: { Status: null } })).be.false();
        should(logic.isValidHead({ Head: { Status: {} } })).be.false();
    });

    it('should extract payload correctly', function () {
        logic.extractPayload({ Body: { Data: { foo: 1 } } }).should.deepEqual({ foo: 1 });
        logic.extractPayload({}).should.deepEqual({});
        logic.extractPayload({ Body: {} }).should.deepEqual({});
        logic.extractPayload(null).should.deepEqual({});
        logic.extractPayload(undefined).should.deepEqual({});
        logic.extractPayload({ Body: null }).should.deepEqual({});
        logic.extractPayload({ Body: { Data: null } }).should.deepEqual({});
    });
});
