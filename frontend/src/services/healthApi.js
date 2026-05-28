import apiClient from './apiClient.js'

export const healthApi = {
  check() {
    return apiClient.get('/health')
  },
}
