// Provider activation is a server-owner decision. A key alone never opts in.
export const externalAPIsEnabled = () => process.env.PITCHVIVA_ENABLE_EXTERNAL_APIS === '1';
export const validProviderKey = value => typeof value === 'string' && /^[A-Za-z0-9_-]{20,200}$/.test(value);
export const pendingIntegration = {
  status: 'pending',
  available: false,
  error: 'Live integrations are pending. Continue with the local workspace; your content has not been sent to a provider.'
};
