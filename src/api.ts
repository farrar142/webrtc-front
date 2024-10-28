import axios, { Axios, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

class AxiosClient {
  baseUrl: string;
  client: Axios;
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: { 'Content-Type': 'application/json' },
    });
    this.client.interceptors.request.use(this.onRequestSuccess);
    this.client.interceptors.response.use(this.onResponseError);
  }

  onRequestSuccess = (value: InternalAxiosRequestConfig) => {
    return value;
  };
  onResponseError = (error: AxiosResponse) => {
    return error;
  };
}

export const client = new AxiosClient().client;
