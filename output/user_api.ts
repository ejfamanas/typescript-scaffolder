import { GET_RES_user } from "../../interfaces/GET_RES_user";
import axios from "axios";
import { AxiosRequestConfig } from "axios";

export async function GET_user(id: string, headers?: Record<string, string>): Promise<GET_RES_user> {

          const authHeaders = { "x-api-key": "test-key" };
          const response = await axios.get(
            `https://api.example.com/users/${id}`,
            
            {
              headers: {
                ...authHeaders,
                ...headers,
              },
            } as AxiosRequestConfig
          );
          return response.data;
        
}
