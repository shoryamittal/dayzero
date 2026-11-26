/**
 * This release deliberately runs without live integrations. Keep the browser
 * switch off until the owner finishes provider setup and end-to-end checks.
 * Server routes enforce their own, independent environment gate.
 */
export const EXTERNAL_APIS_ENABLED = false;

export const INTEGRATION_PENDING_MESSAGE =
  'Live AI and web research are pending setup. Your local workspace, supplied rules, review checks and exports are available.';

export function externalIntegrationsEnabled() {
  return EXTERNAL_APIS_ENABLED;
}

export const integrationStatus = Object.freeze([
  {id: 'ai', name: 'AI drafting and deep review', status: 'pending', local: 'Edit your story, use local checks and review slide text.'},
  {id: 'research', name: 'Live competition research', status: 'pending', local: 'Use the saved event directory and add organizer rules yourself.'},
  {id: 'media', name: 'Stock photos and connected templates', status: 'pending', local: 'Choose a built-in design, upload images or use an organizer PowerPoint.'},
  {id: 'sync', name: 'Accounts and cloud sync', status: 'pending', local: 'Save on this device and export or restore project backups.'},
  {id: 'payments', name: 'Payments and paid orders', status: 'pending', local: 'The local workspace is free; no checkout or paid order is active.'},
]);
