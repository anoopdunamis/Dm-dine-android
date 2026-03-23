export const DEFAULT_API_BASE_URL = 'https://dm-outlet.com/dmfp/administrator/json/';
export const DEFAULT_IMAGE_BASE_URL = 'https://dynafiles.s3.us-east-2.amazonaws.com/dmfp/';

export const getApiBaseUrl = () => {
  let url = localStorage.getItem('dinesync_api_base_url') || DEFAULT_API_BASE_URL;
  if (url && !url.endsWith('/')) url += '/';
  return url;
};

export const setApiBaseUrl = (url: string) => {
  let finalUrl = url.trim();
  if (finalUrl) {
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    if (!finalUrl.endsWith('/')) {
      finalUrl += '/';
    }
  }
  localStorage.setItem('dinesync_api_base_url', finalUrl);
};

export const getImageBaseUrl = () => {
  let url = localStorage.getItem('dinesync_image_base_url') || DEFAULT_IMAGE_BASE_URL;
  if (url && !url.endsWith('/')) url += '/';
  return url;
};

export const setImageBaseUrl = (url: string) => {
  let finalUrl = url.trim();
  if (finalUrl) {
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    if (!finalUrl.endsWith('/')) {
      finalUrl += '/';
    }
  }
  localStorage.setItem('dinesync_image_base_url', finalUrl);
};
