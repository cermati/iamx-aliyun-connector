function mapRAMUserToContextUser(user) {
  return {
    userId: user.UserId,
    username: user.UserName,
    displayName: user.DisplayName || '',
    email: user.Email || '',
    mobilePhone: user.MobilePhone || '',

  };
}

exports.mapRAMUserToContextUser = mapRAMUserToContextUser;
