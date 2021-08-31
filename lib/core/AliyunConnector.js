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
    return this.accountManager.deleteLoginProfile(mContext.ramUser, mContext.loginProfile)
      .then(this.accountManager.detachPolicies(mContext.ramUser, mContext.accessPolicies))
      .then(this.accountManager.removeFromGroups(mContext.ramUser, mContext.accessPolicies))
      .then(() => {
        return Promise.resolve(setTimeout(() => {
          this.accountManager.deleteUser(mContext.ramUser);
        }, TimeoutDelay));
      })
      .then(() => Promise.resolve(mContext));
  };

  /**
   * Show user based on username
   * @param {Schema.AliyunContext} context
   * @returns {Promise<Schema.AliyunContext}
   */
  show(context) {
    let mContext = { ...context };
    return this.accountManager.getUser(mContext.ramUser)
      .then((response) => {
        let ramUser = util.mapRAMUserToContextUser(response.User);

        let groupsPromise = this.accountManager.listAssignedGroups(ramUser)
          .then(resp => resp.Groups.Group.map(g => g.GroupName));

        let policiesPromise = this.accountManager.listAttachedPolicies(ramUser)
          .then(resp => resp.Policies.Policy.map(p => {
            return { name: p.PolicyName, type: p.PolicyType }
          }));

        return groupsPromise.then(groups => {
          return policiesPromise
            .then(userPolicies => {
              return {
                ramUser,
                accessPolicies: { groups, userPolicies }
              }
            })
        });
      });
  };

  /**
   * Retrieve list of user
   * @param {Schema.ListContext} context 
   * @returns {Promise<BatchIterator>}
   */
  fetchBatch(context) {
    let mContext = { ...context };
    return this.accountManager.listUsers(mContext)
      .then(resp => {

        let userPromises = resp.Users.User.map(user => {
          let ramUser = util.mapRAMUserToContextUser(user);

          let groupsPromise = this.accountManager.listAssignedGroups(ramUser)
            .then(resp => resp.Groups.Group.map(g => g.GroupName));

          let policiesPromise = this.accountManager.listAttachedPolicies(ramUser)
            .then(resp => resp.Policies.Policy.map(p => {
              return { name: p.PolicyName, type: p.PolicyType }
            }));

          return groupsPromise.then(groups => {
            return policiesPromise
              .then(userPolicies => {
                return {
                  ramUser,
                  accessPolicies: { groups, userPolicies }
                }
              })
          });
        });

        let filteredUsers = Promise
          .filter(userPromises, (ramUser) => {
            if (!context.containGroup) {
              return true;
            }
            return ramUser.accessPolicies.groups.includes(context.containGroup)
          });

        return filteredUsers.then(users => new BatchIterator(this, {
          results: users,
          marker: resp.Marker,
          maxItems: context.maxItems,
          containGroup: context.containGroup,
          isTruncated: resp.IsTruncated
        }))
      });
  }
};
