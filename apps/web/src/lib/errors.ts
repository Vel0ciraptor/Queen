export const getApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error inesperado'): string => {
  const err = error as {
    response?: { data?: { message?: string | string[]; error?: string } };
    message?: string;
  };

  const message = err?.response?.data?.message;

  if (Array.isArray(message)) return message[0];
  if (typeof message === 'string' && message.trim()) return message;

  if (typeof err?.response?.data?.error === 'string') return err.response.data.error;
  if (typeof err?.message === 'string' && !/Network Error/i.test(err.message)) return err.message;

  return fallback;
};
