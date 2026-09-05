// OHOS 默认画布(W3 产品化, 2026-09-05): 前端默认新画布 = SD-Turbo 轻量工作流
// (256×256, 2 步 euler, sd_turbo.safetensors —— 与 comfyui-src templates/
// sd_turbo_text2image_256.json 同源, 设备小内存形态, patch 17 catalog 配套)。
// 官方 prodDefaultGraph(SD3/AuraFlow 大模型)保留在 defaultGraph.ts 供升级参照。
import type { ComfyWorkflowJSON } from '@/platform/workflow/validation/schemas/workflowSchema'

export const ohosDefaultGraph = {
  "last_node_id": 7,
  "last_link_id": 10,
  "nodes": [
    {
      "id": 1,
      "type": "CheckpointLoaderSimple",
      "pos": [
        48,
        300
      ],
      "size": [
        315,
        98
      ],
      "flags": {},
      "order": 0,
      "mode": 0,
      "inputs": [],
      "outputs": [
        {
          "name": "MODEL",
          "type": "MODEL",
          "links": [
            1,
            4
          ],
          "slot_index": 0
        },
        {
          "name": "CLIP",
          "type": "CLIP",
          "links": [
            2,
            3
          ],
          "slot_index": 1
        },
        {
          "name": "VAE",
          "type": "VAE",
          "links": [
            7
          ],
          "slot_index": 2
        }
      ],
      "properties": {
        "Node name for S&R": "CheckpointLoaderSimple"
      },
      "widgets_values": [
        "sd_turbo.safetensors"
      ]
    },
    {
      "id": 2,
      "type": "CLIPTextEncode",
      "pos": [
        420,
        110
      ],
      "size": [
        330,
        194
      ],
      "flags": {},
      "order": 1,
      "mode": 0,
      "inputs": [
        {
          "name": "clip",
          "type": "CLIP",
          "link": 2
        }
      ],
      "outputs": [
        {
          "name": "CLIP",
          "type": "CLIP",
          "links": [
            5
          ],
          "slot_index": 0
        }
      ],
      "properties": {
        "Node name for S&R": "CLIPTextEncode"
      },
      "widgets_values": [
        "a cat under a tree, anime style"
      ]
    },
    {
      "id": 3,
      "type": "CLIPTextEncode",
      "pos": [
        420,
        350
      ],
      "size": [
        330,
        194
      ],
      "flags": {},
      "order": 2,
      "mode": 0,
      "inputs": [
        {
          "name": "clip",
          "type": "CLIP",
          "link": 3
        }
      ],
      "outputs": [
        {
          "name": "CLIP",
          "type": "CLIP",
          "links": [
            6
          ],
          "slot_index": 0
        }
      ],
      "properties": {
        "Node name for S&R": "CLIPTextEncode"
      },
      "widgets_values": [
        "blurry, low quality, watermark"
      ]
    },
    {
      "id": 4,
      "type": "EmptyLatentImage",
      "pos": [
        420,
        590
      ],
      "size": [
        315,
        106
      ],
      "flags": {},
      "order": 3,
      "mode": 0,
      "inputs": [],
      "outputs": [
        {
          "name": "LATENT",
          "type": "LATENT",
          "links": [
            8
          ],
          "slot_index": 0
        }
      ],
      "properties": {
        "Node name for S&R": "EmptyLatentImage"
      },
      "widgets_values": [
        256,
        256,
        1
      ]
    },
    {
      "id": 5,
      "type": "KSampler",
      "pos": [
        780,
        100
      ],
      "size": [
        315,
        262
      ],
      "flags": {},
      "order": 4,
      "mode": 0,
      "inputs": [
        {
          "name": "model",
          "type": "MODEL",
          "link": 4
        },
        {
          "name": "positive",
          "type": "CONDITIONING",
          "link": 5
        },
        {
          "name": "negative",
          "type": "CONDITIONING",
          "link": 6
        },
        {
          "name": "latent_image",
          "type": "LATENT",
          "link": 8
        }
      ],
      "outputs": [
        {
          "name": "LATENT",
          "type": "LATENT",
          "links": [
            9
          ],
          "slot_index": 0
        }
      ],
      "properties": {
        "Node name for S&R": "KSampler"
      },
      "widgets_values": [
        42,
        "randomize",
        2,
        1.0,
        "euler",
        "normal",
        1.0
      ]
    },
    {
      "id": 6,
      "type": "VAEDecode",
      "pos": [
        1140,
        190
      ],
      "size": [
        210,
        46
      ],
      "flags": {},
      "order": 5,
      "mode": 0,
      "inputs": [
        {
          "name": "samples",
          "type": "LATENT",
          "link": 9
        },
        {
          "name": "vae",
          "type": "VAE",
          "link": 7
        }
      ],
      "outputs": [
        {
          "name": "IMAGE",
          "type": "IMAGE",
          "links": [
            10
          ],
          "slot_index": 0
        }
      ],
      "properties": {
        "Node name for S&R": "VAEDecode"
      },
      "widgets_values": []
    },
    {
      "id": 7,
      "type": "SaveImage",
      "pos": [
        1400,
        150
      ],
      "size": [
        315,
        260
      ],
      "flags": {},
      "order": 6,
      "mode": 0,
      "inputs": [
        {
          "name": "images",
          "type": "IMAGE",
          "link": 10
        }
      ],
      "outputs": [],
      "properties": {
        "Node name for S&R": "SaveImage"
      },
      "widgets_values": [
        "sd_turbo_256x256"
      ]
    }
  ],
  "links": [
    [
      1,
      1,
      0,
      5,
      0,
      "MODEL"
    ],
    [
      2,
      1,
      1,
      2,
      0,
      "CLIP"
    ],
    [
      3,
      1,
      1,
      3,
      0,
      "CLIP"
    ],
    [
      4,
      1,
      0,
      5,
      0,
      "MODEL"
    ],
    [
      5,
      2,
      0,
      5,
      1,
      "CONDITIONING"
    ],
    [
      6,
      3,
      0,
      5,
      2,
      "CONDITIONING"
    ],
    [
      7,
      1,
      2,
      6,
      1,
      "VAE"
    ],
    [
      8,
      4,
      0,
      5,
      3,
      "LATENT"
    ],
    [
      9,
      5,
      0,
      6,
      0,
      "LATENT"
    ],
    [
      10,
      6,
      0,
      7,
      0,
      "IMAGE"
    ]
  ],
  "groups": [],
  "config": {},
  "extra": {},
  "version": 0.4
} as ComfyWorkflowJSON
