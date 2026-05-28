{
  "openapi": "3.1.0",
  "info": {
    "title": "3D Object Detection Backend",
    "version": "1.0.0"
  },
  "paths": {
    "/api/health": {
      "get": {
        "tags": [
          "Health"
        ],
        "summary": "Health Check",
        "operationId": "health_check_api_health_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          }
        }
      }
    },
    "/api/models": {
      "get": {
        "tags": [
          "Models"
        ],
        "summary": "Get Models",
        "operationId": "get_models_api_models_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          }
        }
      }
    },
    "/api/uploads/image": {
      "post": {
        "tags": [
          "Uploads"
        ],
        "summary": "Upload Image",
        "operationId": "upload_image_api_uploads_image_post",
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/Body_upload_image_api_uploads_image_post"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/uploads/video": {
      "post": {
        "tags": [
          "Uploads"
        ],
        "summary": "Upload Video",
        "operationId": "upload_video_api_uploads_video_post",
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/Body_upload_video_api_uploads_video_post"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/detections/image": {
      "post": {
        "tags": [
          "Detections"
        ],
        "summary": "Detect Image Api",
        "operationId": "detect_image_api_api_detections_image_post",
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/Body_detect_image_api_api_detections_image_post"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/detections/video": {
      "post": {
        "tags": [
          "Detections"
        ],
        "summary": "Detect Video Api",
        "operationId": "detect_video_api_api_detections_video_post",
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/Body_detect_video_api_api_detections_video_post"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/jobs/{job_id}": {
      "get": {
        "tags": [
          "Jobs"
        ],
        "summary": "Get Job Status",
        "operationId": "get_job_status_api_jobs__job_id__get",
        "parameters": [
          {
            "name": "job_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Job Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/api/jobs/{job_id}/result": {
      "get": {
        "tags": [
          "Jobs"
        ],
        "summary": "Get Job Result",
        "operationId": "get_job_result_api_jobs__job_id__result_get",
        "parameters": [
          {
            "name": "job_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Job Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {

                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Body_detect_image_api_api_detections_image_post": {
        "properties": {
          "file": {
            "type": "string",
            "contentMediaType": "application/octet-stream",
            "title": "File"
          },
          "model_id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Model Id"
          },
          "confidence": {
            "type": "number",
            "title": "Confidence",
            "default": 0.25
          },
          "iou": {
            "type": "number",
            "title": "Iou",
            "default": 0.45
          },
          "enable_3d": {
            "type": "boolean",
            "title": "Enable 3D",
            "default": false
          },
          "enable_pose": {
            "type": "boolean",
            "title": "Enable Pose",
            "default": false
          }
        },
        "type": "object",
        "required": [
          "file"
        ],
        "title": "Body_detect_image_api_api_detections_image_post"
      },
      "Body_detect_video_api_api_detections_video_post": {
        "properties": {
          "file": {
            "type": "string",
            "contentMediaType": "application/octet-stream",
            "title": "File"
          },
          "model_id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Model Id"
          },
          "confidence": {
            "type": "number",
            "title": "Confidence",
            "default": 0.25
          },
          "iou": {
            "type": "number",
            "title": "Iou",
            "default": 0.45
          },
          "enable_tracking": {
            "type": "boolean",
            "title": "Enable Tracking",
            "default": true
          },
          "enable_3d": {
            "type": "boolean",
            "title": "Enable 3D",
            "default": false
          },
          "enable_pose": {
            "type": "boolean",
            "title": "Enable Pose",
            "default": false
          }
        },
        "type": "object",
        "required": [
          "file"
        ],
        "title": "Body_detect_video_api_api_detections_video_post"
      },
      "Body_upload_image_api_uploads_image_post": {
        "properties": {
          "file": {
            "type": "string",
            "contentMediaType": "application/octet-stream",
            "title": "File"
          }
        },
        "type": "object",
        "required": [
          "file"
        ],
        "title": "Body_upload_image_api_uploads_image_post"
      },
      "Body_upload_video_api_uploads_video_post": {
        "properties": {
          "file": {
            "type": "string",
            "contentMediaType": "application/octet-stream",
            "title": "File"
          }
        },
        "type": "object",
        "required": [
          "file"
        ],
        "title": "Body_upload_video_api_uploads_video_post"
      },
      "HTTPValidationError": {
        "properties": {
          "detail": {
            "items": {
              "$ref": "#/components/schemas/ValidationError"
            },
            "type": "array",
            "title": "Detail"
          }
        },
        "type": "object",
        "title": "HTTPValidationError"
      },
      "ValidationError": {
        "properties": {
          "loc": {
            "items": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "integer"
                }
              ]
            },
            "type": "array",
            "title": "Location"
          },
          "msg": {
            "type": "string",
            "title": "Message"
          },
          "type": {
            "type": "string",
            "title": "Error Type"
          },
          "input": {
            "title": "Input"
          },
          "ctx": {
            "type": "object",
            "title": "Context"
          }
        },
        "type": "object",
        "required": [
          "loc",
          "msg",
          "type"
        ],
        "title": "ValidationError"
      }
    }
  }
}
Beta
0 / 0
used queries
1