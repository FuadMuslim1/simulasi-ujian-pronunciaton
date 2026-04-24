const DEFAULT_USERNAME = 'fuadmuslym';
const DEFAULT_PASSWORD = 'mrgondrong';

const expectedUsername = (import.meta.env.VITE_MOCK_USERNAME || DEFAULT_USERNAME).trim();
const expectedPassword = (import.meta.env.VITE_MOCK_PASSWORD || DEFAULT_PASSWORD).trim();

export const authenticateUser = async (usernameInput: string, passwordInput: string): Promise<boolean> => {
  const normalizedUsername = usernameInput.trim().toLowerCase();
  const normalizedExpectedUsername = expectedUsername.toLowerCase();

  return normalizedUsername === normalizedExpectedUsername && passwordInput.trim() === expectedPassword;
};

