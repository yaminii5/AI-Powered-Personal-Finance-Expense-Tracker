import { getUser, createUser, updateUser, deleteUser } from '../api';

const userService = {
  login: (username) => getUser(username),
  register: (username, firstName) => createUser({ username, first_name: firstName }),
  update: (username, firstName) => updateUser(username, { first_name: firstName }),
  remove: (username) => deleteUser(username),
};

export default userService;

