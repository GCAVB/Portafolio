const contactApiUrl = String(
  import.meta.env.VITE_CONTACT_API_URL || ''
)
  .trim()
  .replace(/\/+$/, '');

const contactFieldMap = Object.freeze({
  name: 'nombre',
  email: 'email',
  subject: 'asunto',
  message: 'mensaje'
});

export const CONTACT_API = Object.freeze({
  enabled: contactApiUrl.length > 0,

  endpoint: contactApiUrl,

  method: 'POST',

  bodyType: 'form-data',

  timeoutMs: 120000,

  fieldMap: contactFieldMap
});