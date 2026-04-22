export const normalizePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return null;

  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly || digitsOnly.length < 7 || digitsOnly.length > 15) {
    return null;
  }

  return digitsOnly;
};
