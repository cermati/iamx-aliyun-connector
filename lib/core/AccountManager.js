'use strict';

const Promise = require('bluebird');
const RPCClient = require('@alicloud/pop-core');

exports.AccountManager = class AccountManager {
  constructor (config) {
    this.config = config;
  };

  rpcClient () {
    if (!this._rpcClient){
      this._rpcClient = new RPCClient({
        accessKeyId: this.config.credentials.accessKeyId,
        accessKeySecret: this.config.credentials.accessKeySecret,
        endpoint: 'https://ram.aliyuncs.com',
        apiVersion: '2015-05-01'
      });
    }

    return this._rpcClient;
  }

  getUser (ramUser) {
    return this.rpcClient().request('GetUser', {
      UserName: ramUser.username
    });
  };

  listUsers (params) {
    let query = {};
    if (params && params.maxItems) { query.MaxItems = params.maxItems }
    if (params && params.marker) { query.Marker = params.marker }

    return this.rpcClient().request('ListUsers', query);
  }

  listAttachedPolicies (ramUser) {
    return this.rpcClient().request('ListPoliciesForUser', {
      UserName: ramUser.username
    });
  };

  listAssignedGroups (ramUser) {
    return this.rpcClient().request('ListGroupsForUser', {
      UserName: ramUser.username
    });
  };

  createUser(ramUser) {
    return this.getUser(ramUser)
      .catch((err)=> {
        if (err.name !== 'EntityNotExist.UserError') {
          throw(err);
        }
        return this.rpcClient().request('CreateUser', {
          UserName: ramUser.username,
          Comments: ramUser.comments || '',
          DisplayName: ramUser.displayName || '',
          Email: ramUser.email || '',
          MobilePhone: ramUser.mobilePhone || ''
        });
      });
  }

  deleteUser (ramUser) {
    if (!ramUser.deleteUser) {
      return Promise.resolve(null);
    }
    return this.rpcClient().request('DeleteUser', { UserName: ramUser.username });
  };

  createLoginProfile(ramUser, loginProfile) {
    if (!loginProfile || !loginProfile.password) {
      return Promise.resolve(null);
    }
    // CreateLoginProfile action will update the existing one if already exists
    return this.rpcClient().request('CreateLoginProfile', {
      UserName: ramUser.username,
      Password: loginProfile.password,
      PasswordResetRequired: loginProfile.requirePasswordReset || true
    });
  };

  deleteLoginProfile (ramUser) {
    if (!ramUser.deleteUser) {
      return Promise.resolve(null);
    }
    return this.rpcClient().request('DeleteLoginProfile', { UserName: ramUser.username })
      .catch((err) => {
        if (err.name === 'EntityNotExist.User.LoginProfileError') {
          return Promise.resolve(null);
        }
        throw(err);
      });
  };

  attachPolicies (ramUser, accessPolicies) {
    return this._attachUserPolicies(ramUser, accessPolicies && accessPolicies.userPolicies || []);
  };

  detachPolicies (ramUser, accessPolicies) {
    if (!ramUser.deleteUser) {
      return this._detachUserPolicies(ramUser, accessPolicies && accessPolicies.userPolicies || []);
    }
    return this.listAttachedPolicies(ramUser)
        .then((result) => {
          let attachedPolicies = result.Policies.Policy.map((o) => {
            return { name: o.PolicyName, type: o.PolicyType };
          });
          return this._detachUserPolicies(ramUser, attachedPolicies);
        });
  };

  addToGroups (ramUser, accessPolicies) {
    return this._addToGroups(ramUser, accessPolicies && accessPolicies.groups || []);
  };

  removeFromGroups (ramUser, accessPolicies) {
    if (!ramUser.deleteUser) {
      return this._removeFromGroups(ramUser, accessPolicies && accessPolicies.groups || []);
    }
    return this.listAssignedGroups(ramUser)
        .then((result) => {
          let assignedGroups = result.Groups.Group.map((o) => o.GroupName);
          return this._removeFromGroups(ramUser, assignedGroups);
        });
  };

  _attachUserPolicies (ramUser, userPolicies) {
    return Promise.map(userPolicies, (userPolicy) => {
      return this.rpcClient().request('AttachPolicyToUser', {
        UserName: ramUser.username,
        PolicyName: userPolicy.name,
        PolicyType: userPolicy.type
      })
      .catch((err) => {
        if (err.name === 'EntityAlreadyExists.User.PolicyError') {
          return Promise.resolve(null);
        }
        throw(err);
      });
    });
  };

  _detachUserPolicies (ramUser, userPolicies) {
    return Promise.map(userPolicies, (userPolicy) => {
      return this.rpcClient().request('DetachPolicyFromUser', {
        UserName: ramUser.username,
        PolicyName: userPolicy.name,
        PolicyType: userPolicy.type
      })
      .catch((err) => {
        if (err.name === 'EntityNotExist.User.PolicyError') {
          return Promise.resolve(null);
        }
        throw(err);
      });
    });
  };

  _addToGroups (ramUser, groups) {
    return Promise.map(groups, (group) => {
      return this.rpcClient().request('AddUserToGroup', {
        UserName: ramUser.username,
        GroupName: group
      })
      .catch((err) => {
        if (err.name === 'EntityAlreadyExists.User.GroupError') {
          return Promise.resolve(null);
        }
        throw(err);
      });
    });
  };

  _removeFromGroups (ramUser, groups) {
    return Promise.map(groups, (group) => {
      return this.rpcClient().request('RemoveUserFromGroup', {
        UserName: ramUser.username,
        GroupName: group
      })
      .catch((err) => {
        if (err.name === 'EntityNotExist.User.GroupError') {
          return Promise.resolve(null);
        }
        throw(err);
      });
    });
  };
};
