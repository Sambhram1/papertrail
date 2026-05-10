import OpenAI from "openai";

let client: OpenAI | null = null;
const DEFAULT_NVIDIA_TEXT_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1.5";
const DEFAULT_NVIDIA_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl";

function getClient() {
  if (!process.env.NVIDIA_API_KEY) {
    return null;
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1"
    });
  }

  return client;
}

export async function analyzeWithModel({
  imageDataUrl,
  prompt
}: {
  imageDataUrl?: string;
  prompt: string;
}) {
  const providerClient = getClient();

  if (!providerClient) {
    return null;
  }

  try {
    const model =
      process.env.NVIDIA_MODEL ||
      (imageDataUrl
        ? process.env.NVIDIA_VISION_MODEL || DEFAULT_NVIDIA_VISION_MODEL
        : process.env.NVIDIA_TEXT_MODEL || DEFAULT_NVIDIA_TEXT_MODEL);

    const completion = await providerClient.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You convert messy admin content into strict JSON only."
        },
        imageDataUrl
          ? {
              role: "user",
              content: `${prompt}\n\n<img src="${imageDataUrl}" />`
            }
          : {
              role: "user",
              content: prompt
            }
      ],
      response_format: {
        type: "json_object"
      }
    });

    return completion.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
