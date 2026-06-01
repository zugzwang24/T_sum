const { createApp } = require("./app");

const PORT = Number(process.env.PORT ?? 4000);

function logAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const provider = process.env.EXPLANATION_PROVIDER || process.env.EXPLANATION_MODE || "openai";
  const model = process.env.OPENAI_MODEL || "gpt-5-nano";

  console.log(
    [
      "[AI CONFIG]",
      `provider=${provider}`,
      `model=${model}`,
      `apiKeyConfigured=${Boolean(apiKey)}`,
      `apiKeyPrefix=${apiKey ? apiKey.slice(0, 8) : ""}`,
    ].join("\n")
  );
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`황금을 찾아라 API 서버 실행 중: http://localhost:${PORT}`);
  logAiConfig();
});

