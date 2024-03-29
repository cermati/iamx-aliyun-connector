const Schema = require('./Schema');

class BatchIterator {
  /**
   * @typedef {import('./AliyunConnector').Connector} Connector
   * @param {Connector} connector 
   * @param {Object} batchPayload 
   * @param {Schema.AliyunContext[]} batchPayload.results
   * @param {boolean} batchPayload.isTruncated
   * @param {string} batchPayload.marker
   * @param {string} batchPayload.containGroup
   * @param {number} batchPayload.maxItems
   */
  constructor(connector, batchPayload) {
    this.connector = connector;
    this.results = batchPayload.results;
    this.marker = batchPayload.marker;
    this.maxItems = batchPayload.maxItems;
    this.isTruncated = batchPayload.isTruncated;
    this.containGroup = batchPayload.containGroup;
  }

  hasNext() {
    return this.isTruncated;
  }

  /**
   * @returns {Promise<BatchIterator>}
   */
  next() {
    if (!this.hasNext()) {
      return Promise.resolve(null);
    }

    return this.connector.fetchBatch({
      marker: this.marker,
      maxItems: this.maxItems,
      containGroup: this.containGroup,
    });
  }
}

exports.BatchIterator = BatchIterator;
