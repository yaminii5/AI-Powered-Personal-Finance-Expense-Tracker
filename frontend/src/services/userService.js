import { getUser, loginUser, createUser, updateUser, deleteUser } from '../api';

const userService = {
  login: (username, password) => loginUser({ username, password }),
  getProfile: (username) => getUser(username),
  register: (username, firstName, password) =>
    createUser({ username, first_name: firstName, password }),
  update: (username, firstName, password) =>
    updateUser(username, {
      first_name: firstName,
      ...(password ? { password } : {}),
    }),
  remove: (username) => deleteUser(username),
};

export default userService;

