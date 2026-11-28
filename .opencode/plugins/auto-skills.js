import { readFileSync } from "fs";
import { join } from "path";

const location = [...import.meta.url].reduce((hash, ch) => (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0, 11);
const pluginId = `auto-skills-${location.toString(16)}`;

const PONYTAIL_STOP = /(?:^|\s)(stop ponytail|normal mode|ponytail off|disable ponytail|\/ponytail off)(?:\s|$)/i;
const PONYTAIL_START = /(?:^|\s)(ponytail on|enable ponytail|\/ponytail(?: lite| full| ultra)?)(?:\s|$)/i;
const GRAPHIFY_STOP = /(?:^|\s)(stop graphify|graphify off|disable graphify|\/graphify off)(?:\s|$)/i;
const GRAPHIFY_START = /(?:^|\s)(graphify on|enable graphify|\/graphify)(?:\s|$)/i;

const rules = [
  "Ponytail is active for this project: make the smallest complete change, reuse what already exists, add no unrequested abstraction or option, keep source comment-free, and end each reply with one line naming what you skipped and any risk.",
  "Graphify is active for this project: when graphify-out/graph.json exists, use graphify query before raw grep or source reads for codebase questions, use graphify path or explain for relationships, and run graphify update . after code edits.",
  "Both stay active for the whole session unless the user says stop ponytail or stop graphify.",
].join(" ");

const injected = new Set();
const ponytailOff = new Set();
const graphifyOff = new Set();

const skillBody = (directory, id) => {
  try {
    const path = join(directory, ".opencode", "skills", id, "SKILL.md");
    return readFileSync(path, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
  } catch {
    return "";
  }
};

const promptText = (output) => {
  const parts = Array.isArray(output.parts) ? output.parts.map((part) => part?.text || "") : [];
  return [output.message?.text || "", ...parts].join("\n");
};

const key = (name, sessionID) => `auto-skills:${name}:${sessionID ?? "default"}`;
const flag = async (ctx, name, sessionID, fallback) => {
  const value = await ctx.storage.get(key(name, sessionID));
  return value === undefined ? fallback : value === true;
};
const skillIds = (event) => {
  const values = Array.isArray(event.prompt?.skills) ? event.prompt.skills : [];
  return new Set(values.map((value) => (typeof value === "string" ? value : value?.id)).filter(Boolean));
};

export default {
  id: pluginId,

  async server({ directory }) {
    const ponytail = skillBody(directory, "ponytail");
    const graphify = skillBody(directory, "graphify");
    const content = [
      ponytail ? `## Skill: ponytail\n${ponytail}` : "",
      graphify ? `## Skill: graphify\n${graphify}` : "",
    ].filter(Boolean).join("\n\n");

    return {
      "chat.message": async (input, output) => {
        const sessionID = input.sessionID || "default";
        const text = promptText(output);
        if (PONYTAIL_STOP.test(text)) {
          ponytailOff.add(sessionID);
        } else if (PONYTAIL_START.test(text)) {
          ponytailOff.delete(sessionID);
          injected.delete(sessionID);
        }
        if (GRAPHIFY_STOP.test(text)) {
          graphifyOff.add(sessionID);
        } else if (GRAPHIFY_START.test(text)) {
          graphifyOff.delete(sessionID);
          injected.delete(sessionID);
        }
      },

      "experimental.chat.system.transform": async (input, output) => {
        const sessionID = input.sessionID || "default";
        if (injected.has(sessionID) || !content) return;
        if (ponytailOff.has(sessionID) && graphifyOff.has(sessionID)) return;
        let section = content;
        if (ponytailOff.has(sessionID)) section = graphify ? `## Skill: graphify\n${graphify}` : "";
        if (graphifyOff.has(sessionID)) section = ponytail ? `## Skill: ponytail\n${ponytail}` : "";
        if (!section) return;
        output.system.push(section);
        injected.add(sessionID);
      },
    };
  },

  async setup(ctx) {
    const registrations = [];

    if (typeof ctx.session?.hook === "function") {
      registrations.push(await ctx.session.hook("prompt", async (event) => {
        const sessionID = event.sessionID;
        const text = event.prompt?.text || "";
        const attached = await flag(ctx, "attached", sessionID, false);
        let offPonytail = await flag(ctx, "ponytail-off", sessionID, false);
        let offGraphify = await flag(ctx, "graphify-off", sessionID, false);

        if (PONYTAIL_STOP.test(text)) offPonytail = true;
        else if (PONYTAIL_START.test(text)) offPonytail = false;
        if (GRAPHIFY_STOP.test(text)) offGraphify = true;
        else if (GRAPHIFY_START.test(text)) offGraphify = false;

        await ctx.storage.set(key("ponytail-off", sessionID), offPonytail);
        await ctx.storage.set(key("graphify-off", sessionID), offGraphify);
        if (attached) return;

        if (!Array.isArray(event.prompt.skills)) event.prompt.skills = [];
        const existing = skillIds(event);
        const wanted = [];
        if (!offPonytail && !existing.has("ponytail")) wanted.push({ id: "ponytail" });
        if (!offGraphify && !existing.has("graphify")) wanted.push({ id: "graphify" });
        if (wanted.length) {
          event.prompt.skills.push(...wanted);
          await ctx.storage.set(key("attached", sessionID), true);
        }
      }));

      registrations.push(await ctx.session.hook("context", async (event) => {
        const sessionID = event.sessionID;
        const offPonytail = await flag(ctx, "ponytail-off", sessionID, false);
        const offGraphify = await flag(ctx, "graphify-off", sessionID, false);
        const parts = [];
        if (!offPonytail) parts.push(rules.split(" ")[0]);
        if (!offGraphify) parts.push(rules.split(" ")[1]);
        if (!parts.length) return;
        event.system.push({ type: "text", text: parts.join(" ") });
      }));
    }

    return async () => {
      for (const registration of registrations) await registration.dispose();
    };
  },
};
