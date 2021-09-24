'use strict';

const CredentialsRegistryDataSchema = {
  type: 'object',
  properties: {
    credentials: {
      type: 'object',
      properties: {
        accessKeyId: { type: 'string' },
        accessKeySecret: { type: 'string' }
      },
      required: [ 'accessKeyId', 'accessKeySecret' ]
    }
  },
  required: [ 'credentials' ]
};

const MutatingWorkflowContextSchema = {
  type: "object",
  properties: {
    ramUser: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        comments: { type: 'string' },
        displayName: { type: 'string' },
        email: { type: 'string' },
        mobilePhone: { type: 'string' },
        deleteUser: { type: 'boolean', default: false }
      },
      required: [ 'username' ]
    },
    loginProfile: {
      type: 'object',
      properties: {
        password: { type: 'string' },
        requirePasswordReset: { type: 'boolean', default: true }
      },
      required: [ 'password' ]
    },
    accessPolicies: {
      type: 'object',
      properties: {
        userPolicies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' }
            },
            required: [ 'name', 'type' ]
          }
        },
        groups: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      }
    }
  }
};

const ReadOnlyWorkflowContextSchema = {
  type: 'object',
  properties: {
    ramUser: {
      type: 'object',
      properties: {
        username: { type: 'string' }
      },
      required: [ 'username' ]
    }
  }
};

const ListContextSchema = {
  type: "object",
  properties: {
    marker: {
      type: "string",
      description: "unique string that can be used to resume batch retrieval if truncated"
    },
    maxItems: {
      type: "number",
      description : "maximum number of items retrieved from repository",
    },
    containGroup: {
      type: "string",
      description: "Can be use to filter items. Only items that contains certain group will be retrieved",
    },
  }
}

/**
 * @typedef {Object} RamUser
 * @property {string} username
 * @property {string} userId
 * @property {string} displayName
 * @property {string} email
 * @property {string} mobilePhone
 */

/**
 * @typedef {Object} LoginProfile
 * @property {string} password
 * @property {boolean} requirePasswordReset
 */

/**
 * @typedef {Object} UserPolicy
 * @property {string} name
 * @property {string} type
 */

/**
 * @typedef {Object} AliyunContext
 * @property {RamUser} ramUser
 * @property {LoginProfile} [loginProfile]
 * @property {Object} accessPolicies
 * @property {UserPolicy[]} accessPolicies.userPolicies
 * @property {string[]} accessPolicies.groups
 */

/**
 * @typedef {Object} ListContext
 * @property {number} maxItems
 * @property {string} containGroup
 */

exports.CredentialsRegistryDataSchema = CredentialsRegistryDataSchema;
exports.MutatingWorkflowContextSchema = MutatingWorkflowContextSchema;
exports.ReadOnlyWorkflowContextSchema = ReadOnlyWorkflowContextSchema;
exports.ListContextSchema = ListContextSchema;
