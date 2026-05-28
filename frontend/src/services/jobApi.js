import apiClient from './apiClient.js'

export const jobApi = {
  getJobStatus(jobId) {
    return apiClient.get(`/jobs/${jobId}`)
  },

  getJobResult(jobId) {
    return apiClient.get(`/jobs/${jobId}/result`)
  },
}
