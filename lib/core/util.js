function mapRAMUserToContextUser(user) {
  return {
    userId: user.UserId,
    username: user.UserName,
    displayName: user.DisplayName
  };
}

exports.mapRAMUserToContextUser = mapRAMUserToContextUser;