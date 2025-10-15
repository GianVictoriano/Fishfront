// app/screens/collab/manage-requests/manage-requests.js
import { Platform } from 'react-native';

const ManageRequests = Platform.select({
  web: () => require('./manage-requests.web').default,
  default: () => require('./manage-requests.native').default,
})();

export default ManageRequests;
