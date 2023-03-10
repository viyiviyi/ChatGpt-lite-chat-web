import { AskReq } from "@/Models/models";
import { checkToken } from "@/server/liteAuth";
import { NextApiRequest, NextApiResponse } from "next";
import {
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ result?: string; error?: { message: string } }>
) {
  const token: string = req.body.token || "";
  if (!checkToken(token)) {
    res.status(401).json({ error: { message: "未登录 [去登录](/login)" } });
    return;
  }
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message: "OpenAI API key not configured",
      },
    });
    return;
  }
  const message: Array<{
    role: ChatCompletionRequestMessageRoleEnum;
    content: string;
    name: string;
  }> = req.body.message || [];
  const model: string = req.body.model || "text-davinci-003";
  const temperature: number = req.body.temperature || 0.5;
  const user: string = req.body.user || "master";
  const top_p: number = req.body.top_p || 1;
  if (message.length === 0 || !message.join("").trim()) {
    res.status(400).json({
      error: {
        message: "Please enter a valid message",
      },
    });
    return;
  }

  try {
    if (model.startsWith("gpt-3")) {
      const completion = await openai.createChatCompletion({
        model,
        messages: message,
        temperature,
        user,
        max_tokens: 2000,
        top_p,
        n: 1,
      });
      res
        .status(200)
        .json({ result: completion.data.choices[0].message?.content });
    } else {
      const completion = await openai.createCompletion({
        model,
        prompt: message.map((v) => v.content),
        temperature,
        user,
        max_tokens: 2000,
        top_p,
        n: 1,
      });
      res.status(200).json({ result: completion.data.choices[0].text });
    }
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: `Error with OpenAI API request: ${error.message}`,
        },
      });
    }
  }
}
