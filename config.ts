export const DEFAULT_API_BASE_URL = 'https://dm-outlet.com/dmfp/administrator/json/';
export const DEFAULT_IMAGE_BASE_URL = 'https://dynafiles.s3.us-east-2.amazonaws.com/dmfp/';

export const getApiBaseUrl = () => {
  return localStorage.getItem('dinesync_api_base_url') || DEFAULT_API_BASE_URL;
};

export const setApiBaseUrl = (url: string) => {
  localStorage.setItem('dinesync_api_base_url', url);
};

export const getImageBaseUrl = () => {
  return localStorage.getItem('dinesync_image_base_url') || DEFAULT_IMAGE_BASE_URL;
};

export const setImageBaseUrl = (url: string) => {
  localStorage.setItem('dinesync_image_base_url', url);
};
