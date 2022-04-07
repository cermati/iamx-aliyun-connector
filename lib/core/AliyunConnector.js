'use strict';

const Promise = require('bluebird');
const AccountManager = require('./AccountManager').AccountManager;
const Schema = require('./Schema');
const Metadata = require('./Metadata').ModuleMetadata;
const TimeoutDelay = 1000;
const util = require('./util');
const BatchIterator = require('./iterator').BatchIterator;

exports.Connector = class AliyunConnector {
  constructor (config) {
    this.accountManager = new AccountManager(config);
  };

  engine () {
    return Metadata.Engine;
  };

  version () {
    return Metadata.Version;
  };

  name () {
    return Metadata.Name;
  };

  supportedExecution () {
    return Metadata.SupportedExecution;
  };

  registryFormat () {
    return Schema.CredentialsRegistryDataSchema;
  };

  readContextFormat () {
    return Schema.ReadOnlyWorkflowContextSchema;
  };

  writeContextFormat () {
    return Schema.MutatingWorkflowContextSchema;
  };

  listContextFormat () {
    return Schema.ListContextSchema;
  }

  /**
   * Provision an access context
   * @param {Schema.AliyunContext} context
   * @returns {Promise<Schema.AliyunContext}
   */
  provision (context) {
    let mContext = { ...context };
    return this.accountManager.createUser(mContext.ramUser)
      .then(() => {
        return new Promise((resolve, reject) => {
          const asyncOps = [
            this.accountManager.attachPolicies(mContext.ramUser, mContext.accessPolicies),
            this.accountManager.addToGroups(mContext.ramUser, mContext.accessPolicies),
            this.accountManager.createLoginProfile(mContext.ramUser, mContext.loginProfile),
          ]

          Promise.all(asyncOps)
            .then(() => {
              setTimeout(resolve, TimeoutDelay);
            })
            .catch(error => { reject(error); });
        });
      })
      .then(() => Promise.resolve(mContext));
  };

  /**
   * Revoke user
   * @param {Schema.AliyunContext} context
   * @returns {Promise<Schema.AliyunContext}
   */
  revoke (context) {
    let mContext = { ...context };
    await this.accountManager.deleteLoginProfile(mContext.ramUser, mContext.loginProfile);
    await this.accountManager.detachPolicies(mContext.ramUser, mContext.accessPolicies);
    await this.accountManager.removeFromGroups(mContext.ramUser, mContext.accessPolicies);
    await this.accountManager.unbindMFADevice(mContext.ramUser);

    await Promise.resolve(setTimeout(() => {
      this.accountManager.deleteUser(mContext.ramUser);
    }, TimeoutDelay));

    return mContext;
  };

  /**
   * Show user based on username
   * @param {Schema.AliyunContext} context
   * @returns {Promise<Schema.AliyunContext}
   */
  async show(context) {
    let mContext = { ...context };

    let resp = await this.accountManager.getUser(mContext.ramUser);
    let ramUser = util.mapRAMUserToContextUser(resp.User);

    let groupsPromise = await this.accountManager.listAssignedGroups(ramUser);
    let policiesPromise = await this.accountManager.listAttachedPolicies(ramUser);

    let [policyResult, groupResult] = await Promise.all([policiesPromise, groupsPromise]);

    let groups = groupResult.Groups.Group.map(g => g.GroupName);
    let userPolicies = policyResult.Policies.Policy.map(p => {
      return { name: p.PolicyName, type: p.PolicyType };
    });

    return {
      ramUser,
      accessPolicies: {
        groups,
        userPolicies
      }
    }
  };

  /**
   * Retrieve list of user
   * @param {Schema.ListContext} context 
   * @returns {Promise<BatchIterator>}
   */
  async fetchBatch(context) {
    let mContext = { ...context };

    let resp = await this.accountManager.listUsers(mContext);

    let results = await Promise.map(resp.Users.User, async (user) => {
      let ramUser = util.mapRAMUserToContextUser(user);
      // Somehow we don't get email attribute when using listUsers
      // So we return more detailed result using getUser
      return this.show({ ramUser });
    });

    if (mContext.containGroup) {
      results = results.filter(u => u.accessPolicies.groups.includes(mContext.containGroup));
    }

    return new BatchIterator(this, {
      results: results,
      marker: resp.Marker,
      maxItems: mContext.maxItems,
      containGroup: mContext.containGroup,
      isTruncated: resp.IsTruncated
    });
  }
};
