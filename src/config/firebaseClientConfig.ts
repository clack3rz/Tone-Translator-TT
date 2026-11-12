import { selectFirebaseClientConfig } from './selectFirebaseClientConfig';

// Vite replaces this module with the selected public configuration.
// Direct Node consumers use the same selector.
export default selectFirebaseClientConfig(process.env);
