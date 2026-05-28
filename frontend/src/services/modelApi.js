import apiClient from './apiClient.js'

export const modelApi = {
  getModels() {
    return apiClient.get('/models').then((res) => (res?.data !== undefined ? res.data : res))
  },
}
