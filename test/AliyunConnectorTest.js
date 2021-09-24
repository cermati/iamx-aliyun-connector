'use strict';

let describe = require('mocha').describe;
let it = require('mocha').it;
let assert = require('chai').assert;

describe('Aliyun Connector', () => {
  let AliyunConnector = require('../lib/index').Connector;
  let Metadata = require('../lib/core/Metadata').ModuleMetadata;
  let Schema = require('../lib/core/Schema');

  let sampleRegData = {
    credentials: {
      accessKeyId: 'sample-access-key-id',
      accessKeySecret: 'sample-access-key-secret'
    },
    region: 'sample-region'
  };
  let connector = new AliyunConnector ({ ...sampleRegData });

  it('can get correct module properties according to the configured metadata', () => {
    assert.equal(connector.engine(), Metadata.Engine);
    assert.equal(connector.version(), Metadata.Version);
    assert.equal(connector.name(), Metadata.Name);
    assert.equal(connector.supportedExecution(), Metadata.SupportedExecution);
  });

  it('can get correct registry and context schema specifications according to the schema definitions', () => {
    assert.equal(connector.registryFormat(), Schema.CredentialsRegistryDataSchema);
    assert.equal(connector.readContextFormat(), Schema.ReadOnlyWorkflowContextSchema);
    assert.equal(connector.writeContextFormat(), Schema.MutatingWorkflowContextSchema);
    assert.equal(connector.listContextFormat(), Schema.ListContextSchema);
  });

});
