import {
  GptConfig,
  Group,
  Message,
  Topic,
  User,
  VirtualRole,
} from "@/Models/DataBase";
import { KeyValueData } from "./KeyValueData";
function getUuid() {
  if (typeof crypto === "object") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (
      typeof crypto.getRandomValues === "function" &&
      typeof Uint8Array === "function"
    ) {
      const callback = (c: string) => {
        const num = Number(c);
        return (
          num ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))
        ).toString(16);
      };
      return ([1e7].join("") + -1e3 + -4e3 + -8e3 + -1e11).replace(
        /[018]/g,
        callback
      );
    }
  }
  let timestamp = new Date().getTime();
  let perforNow =
    (typeof performance !== "undefined" &&
      performance.now &&
      performance.now() * 1000) ||
    0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    let random = Math.random() * 16;
    if (timestamp > 0) {
      random = (timestamp + random) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
    } else {
      random = (perforNow + random) % 16 | 0;
      perforNow = Math.floor(perforNow / 16);
    }
    return (c === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
export class CahtManagement {
  keyValData: KeyValueData;
  constructor(groupName: string) {
    this.keyValData = new KeyValueData(localStorage);
    this.topic.push({
      id: getUuid(),
      name: "new chat",
      createdAt: new Date(),
    });
    this.virtualRole = {
      id: getUuid(),
      name: this.keyValData.getAssistantName() || "助理",
      avatar: "",
      bio:
        this.keyValData.getAssistantPrefix() ||
        `接下来，你将继承设定角色的所有属性！
只能输出设定角色第一人称的台词！
(在[]内输出动作细节!)
设定角色:私人助理,主动,优雅,女性.`,
      settings: [],
    };

    this.group = {
      id: getUuid(),
      name: groupName,
    };
  }
  readonly user: User | undefined;
  readonly virtualRole: VirtualRole;
  readonly topic: Topic[] = [];
  private readonly messages: Message[] = [];
  readonly group: Group;
  readonly config = { enableVirtualRole: false };
  gptConfig: GptConfig = {
    id: getUuid(),
    model: "gpt-3.5-turbo",
    role: "assistant",
    max_tokens: 300,
    top_p: 1,
    groupId: "",
    temperature: 0.5,
    msgCount: 4,
  };
  static async getKey() {}
  static async provide(
    groupId?: string,
    groupName = "新对话"
  ): Promise<CahtManagement> {
    if (groupId) {
      let chat = CahtManagement.chatList.find((f) => f.group.id === groupId);
      if (chat) return chat;
    }
    if (groupName == "default") {
      const defaultChat = CahtManagement.chatList.find(
        (f) => f.group.name === "default"
      );
      if (defaultChat) return defaultChat;
    }
    const chat = new CahtManagement(groupName);
    CahtManagement.chatList.push(chat);
    return chat;
  }
  private static readonly chatList: CahtManagement[] = [];
  static async list(): Promise<Group[]> {
    // 暂时这样写，等把数据库功能完成后从数据库获取
    return CahtManagement.chatList.map((v) => v.group);
  }
  static getList(): CahtManagement[] {
    return this.chatList;
  }
  private static async create(name = "new Caht"): Promise<Group> {
    return { id: getUuid(), name };
  }
  private static async query(key: string): Promise<Group> {
    return { id: getUuid(), name: "" };
  }
  getMessages(): Message[] {
    return this.messages;
  }
  getAskContext(): Array<{
    role: "assistant" | "user" | "system";
    content: string;
    name: string;
  }> {
    let ctx = this.messages
      .filter((f) => f.topicId === this.topic.slice(-1)[0].id)
      .slice(-this.gptConfig.msgCount)
      .map((v) => ({
        role: this.gptConfig.role,
        content: v.text,
        name: "user",
      }));

    if (this.config.enableVirtualRole) {
      ctx = [
        {
          role: this.gptConfig.role,
          content: this.virtualRole.bio,
          name: "user",
        },
        ...ctx,
      ];
    }
    return ctx;
  }

  setVirtualRoleBio(name: string, bio: string) {
    if (this.group.name === "default") {
      this.keyValData.setAssistantName(name);
      this.keyValData.setAssistantPrefix(bio);
    }
  }
  newTopic(message: string) {
    this.topic.push({
      id: getUuid(),
      name: message.substring(0, 10),
      createdAt: new Date(),
    });
  }
  async setMessage(message: Message) {
    var item = this.messages.find((f) => f.id === message.id);
    if (item != null) {
      Object.assign(item, message);
    }
  }
  async pushMessage(message: string, virtualRoleMsg: boolean) {
    if (!message.trim()) return;
    let msg: Message = {
      id: getUuid(),
      timestamp: Date.now(),
      text: message.trim(),
      virtualRoleId: virtualRoleMsg ? this.virtualRole.id : undefined,
      senderId: virtualRoleMsg ? undefined : this.user?.id,
      topicId: this.topic.slice(-1)[0].id,
      groupId: this.group.id,
    };
    this.messages.push(msg);
  }
  async removeMessage(message: Message) {
    let delIdx = this.messages.findIndex((f) => f.id === message.id);
    if (delIdx !== -1) {
      this.messages.splice(delIdx, 1);
      if (
        this.topic.length > 1 &&
        this.messages.length &&
        this.messages.slice(-1)[0].topicId !== message.topicId
      ) {
        let d = this.topic.findIndex((f) => f.id === message.topicId);
        if (d !== -1) this.topic.splice(d, 1);
      }
    }
  }
  async remove() {}
}
