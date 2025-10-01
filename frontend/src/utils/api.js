import axios from 'axios';

const absoluteUrlPattern = /^https?:\/\//i;

export const getApiUrl = (path) => {
  if (!path) return '';
  if (absoluteUrlPattern.test(path)) return path;

  const base = axios.defaults.baseURL || '';
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${trimmedBase}${normalizedPath}`;
};

export default getApiUrl;
