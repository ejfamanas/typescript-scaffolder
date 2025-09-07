import { GET_RES_user } from "../../interfaces/GET_RES_user";
import axios from "axios";
import { AxiosRequestConfig } from "axios";
import { requestWithRetry_GET_user, requestWithRetry_GET_userByEmail } from "./user_api.requestWithRetry";

export async function GET_user(id: string, headers?: Record<string, string>): Promise<GET_RES_user> {

          const authHeaders = { "x-api-key": "test-key" };
          const response = await requestWithRetry_GET_user(
            () => axios.get(
              `https://api.example.com/users/${id}`,
              
              {
                headers: {
                  ...authHeaders,
                  ...(headers ?? {}),
                },
              } as AxiosRequestConfig
            ),
            {
              enabled: true,
              maxAttempts: 3,
              initialDelayMs: 250,
              multiplier: 2,
              method: "GET"
            }
          );
          return response.data;
        
}

export async function GET_userByEmail(id: string, headers?: Record<string, string>): Promise<GET_RES_user> {

          const authHeaders = { "x-api-key": "test-key" };
          const response = await requestWithRetry_GET_userByEmail(
            () => axios.get(
              `https://api.example.com/users/by-email`,
              
              {
                headers: {
                  ...authHeaders,
                  ...(headers ?? {}),
                },
              } as AxiosRequestConfig
            ),
            {
              enabled: true,
              maxAttempts: 3,
              initialDelayMs: 250,
              multiplier: 2,
              method: "GET"
            }
          );
          return response.data;
        
}
