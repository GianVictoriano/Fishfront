// app/screens/user/registration/index.js
// This is the platform-agnostic entry point
import { Platform } from 'react-native';

// This will automatically load the correct platform file
const Registration = Platform.select({
  web: () => require('./registration.web').default,
  default: () => require('./registration.web').default, // Use web version for native too
})();

export default Registration;