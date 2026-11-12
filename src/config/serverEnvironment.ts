import { EnvironmentConfigurationError } from './environment.ts';

export function validateServerEnvironment(env: NodeJS.ProcessEnv) {
  const appEnvironment = env.APP_ENV;
  if (appEnvironment !== 'development' && appEnvironment !== 'production') {
    throw new EnvironmentConfigurationError('APP_ENV must be explicitly development or production');
  }
  if (env.VITE_APP_ENV !== appEnvironment) {
    throw new EnvironmentConfigurationError('VITE_APP_ENV must match APP_ENV');
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || /\s/.test(apiKey) || apiKey === 'MY_GEMINI_API_KEY') {
    throw new EnvironmentConfigurationError('A valid server-side GEMINI_API_KEY is required');
  }
  return { appEnvironment, apiKey };
}
