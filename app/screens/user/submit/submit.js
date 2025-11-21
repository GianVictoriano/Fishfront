// app/screens/user/submit/index.js
// This is the platform-agnostic entry point
import { Platform } from 'react-native';

// This will automatically load the correct platform file
const Submit = Platform.select({
  web: () => require('./submit.web').default,
  default: () => require('./submit.web').default, // Fallback to web for now
})();

export default Submit;
