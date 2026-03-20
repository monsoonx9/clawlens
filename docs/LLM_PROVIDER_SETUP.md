# LLM Provider Setup Guide

> **Last Updated**: March 20, 2026

## Quick Reference

| Provider       | Best For       | Free Tier      | Default Model               | Speed    |
| -------------- | -------------- | -------------- | --------------------------- | -------- |
| **Groq**       | Real-time chat | 14,400 req/day | llama-3.3-70b-versatile     | 500+ TPS |
| **Anthropic**  | Reasoning      | $5 credit      | claude-sonnet-4-6           | Medium   |
| **OpenAI**     | General        | No             | gpt-5.4                     | Medium   |
| **Gemini**     | Long context   | Yes            | gemini-3.1-pro              | Fast     |
| **Ollama**     | Privacy        | Unlimited      | deepseek-r1                 | Varies   |
| **MiniMax**    | Budget         | Varies         | MiniMax-M2.5                | Fast     |
| **OpenRouter** | Smart routing  | Varies         | anthropic/claude-sonnet-4-6 | Varies   |

---

## Provider Setup Instructions

### Groq (Recommended for Speed)

Groq uses custom LPU (Language Processing Unit) hardware for the fastest inference available.

1. **Get API Key**: https://console.groq.com
2. **Free Tier**: 14,400 requests/day, 30 requests/minute
3. **No credit card required**

**Recommended Models**:

- `llama-3.3-70b-versatile` - General purpose (fastest)
- `qwen3-32b` - Coding and reasoning
- `deepseek-r1-distill-llama-70b` - Complex reasoning

**Strengths**:

- Fastest inference (500+ tokens/second)
- Generous free tier
- OpenAI-compatible API

---

### Anthropic Claude (Recommended for Reasoning)

Anthropic's Claude models excel at complex reasoning and analysis.

1. **Get API Key**: https://console.anthropic.com
2. **Free Credits**: $5 on signup
3. **Pricing**: $3-$25 per million tokens

**Recommended Models**:

- `claude-sonnet-4-6` - Best balance of speed and intelligence (default)
- `claude-opus-4-6` - Deepest reasoning for complex tasks
- `claude-haiku-4-5` - Fast and cost-effective

**Strengths**:

- Excellent reasoning and analysis
- Adaptive thinking mode
- 1M token context window

---

### OpenAI (Recommended for General Use)

OpenAI's GPT-5.4 is the latest flagship model.

1. **Get API Key**: https://platform.openai.com
2. **Requires**: Payment method
3. **Pricing**: $2.50-$180 per million tokens

**Recommended Models**:

- `gpt-5.4` - Latest flagship (March 2026)
- `gpt-5.4-pro` - Premium tier for complex tasks
- `gpt-5-mini` - Fast and cost-effective

**Strengths**:

- Latest model technology
- 1.05M token context window
- Excellent coding abilities

---

### Gemini (Free Option with Long Context)

Google's Gemini models offer excellent free tier and long context.

1. **Get API Key**: https://makersuite.google.com
2. **Free Tier**: Available with limits
3. **Pricing**: Competitive rates

**Recommended Models**:

- `gemini-3.1-pro` - Latest flagship with 1M context
- `gemini-3-flash` - Fast and efficient
- `gemini-3.1-flash-lite` - Most cost-effective

**Strengths**:

- 1M token context window
- Competitive pricing
- Native multimodal support

---

### Ollama (Local/Private)

Run models locally on your machine - no API key required.

1. **Install**: https://ollama.ai
2. **Pull Models**:
   ```bash
   ollama pull deepseek-r1
   ollama pull qwen3:32b
   ```
3. **No API key needed**

**Available Models**:

- `deepseek-r1` - Reasoning (recommended)
- `qwen3:32b` - General purpose
- `llama3.3:70b` - Large model
- `gemma3:12b` - Google's model

**Strengths**:

- Complete privacy
- No API costs
- Works offline

---

### OpenRouter (Smart Routing)

Automatically routes requests to the best model for your task.

1. **Get API Key**: https://openrouter.ai
2. **Features**: Automatic model selection
3. **Pricing**: Varies by routed model

**Recommended Models**:

- `anthropic/claude-sonnet-4-6` - Best value (default)
- `openai/gpt-5.4` - OpenAI via router
- `google/gemini-3.1-pro` - Gemini via router

**Strengths**:

- Automatic best-model selection
- Unified access to multiple providers
- Cost optimization

---

### MiniMax (Budget-Friendly)

Cost-effective option with good quality.

1. **Get API Key**: Contact MiniMax for access
2. **Pricing**: Budget-friendly

**Available Models**:

- `MiniMax-M2.5` - Current stable
- `MiniMax-M3` - Latest version

---

## Model Selection Guide

### For Fastest Responses

**Groq** + `llama-3.3-70b-versatile`

- ~500 tokens/second
- Real-time chat ideal

### For Best Reasoning

**Anthropic** + `claude-sonnet-4-6`

- Adaptive thinking
- Complex analysis

### For Premium/Research

**Anthropic** + `claude-opus-4-6`

- Deepest reasoning
- Long-horizon tasks

### For General Purpose

**OpenAI** + `gpt-5.4`

- Latest technology
- 1.05M context

### For Longest Context

**Gemini** + `gemini-3.1-pro`

- 1M token context
- Competitive pricing

### For Budget

**Groq** (free tier)

- 14,400 requests/day free
- Fast inference

### For Privacy

**Ollama** (local)

- No data leaves your machine
- No API costs

---

## Troubleshooting

### "Model not found" Error

- Check if the model name is correct
- Verify your API key is valid
- Ensure you have access to that model tier

### "Rate limit exceeded"

- Wait and retry with exponential backoff
- Consider upgrading your plan
- Use a fallback model

### "Authentication failed"

- Check API key is correct
- Verify key has required permissions
- Ensure billing is active (paid providers)

### Ollama Connection Issues

- Ensure Ollama is running: `ollama serve`
- Check the base URL (default: `http://localhost:11434`)
- Pull required models: `ollama pull <model-name>`

---

## API Configuration

### Environment Variables (Optional)

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Groq
GROQ_API_KEY=gsk_...

# Gemini
GEMINI_API_KEY=AIza...

# Azure OpenAI
AZURE_OPENAI_KEY=...
AZURE_OPENAI_ENDPOINT=https://...openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5.4
```

---

## Technical Notes

### Streaming

All providers support real-time streaming for better UX.

### Rate Limiting

- **Groq**: 30 req/min (free tier)
- **OpenAI**: Varies by tier
- **Anthropic**: Varies by plan
- **Gemini**: Generous free tier

### Context Windows

| Provider          | Max Context              |
| ----------------- | ------------------------ |
| OpenAI GPT-5.4    | 1,050,000 tokens         |
| Claude Sonnet 4.6 | 200,000 tokens (1M beta) |
| Gemini 3.1 Pro    | 1,000,000 tokens         |
| Groq Llama 3.3    | 128,000 tokens           |
