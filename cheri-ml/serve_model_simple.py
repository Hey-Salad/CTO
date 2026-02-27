from transformers import AutoTokenizer, AutoModelForCausalLM
  from fastapi import FastAPI, HTTPException
  from pydantic import BaseModel
  import uvicorn
  import torch

  app = FastAPI(title="Cheri-ML-1.3B API")

  print("Loading model with transformers...")
  tokenizer = AutoTokenizer.from_pretrained("HeySalad/Cheri-ML-1.3B",
  trust_remote_code=True)
  model = AutoModelForCausalLM.from_pretrained(
      "HeySalad/Cheri-ML-1.3B",
      trust_remote_code=True,
      torch_dtype=torch.float16,
      device_map="auto"
  )
  print("Model loaded!")

  class GenerateRequest(BaseModel):
      prompt: str
      max_tokens: int = 100
      temperature: float = 0.7

  class GenerateResponse(BaseModel):
      generated_text: str
      prompt: str

  @app.get("/")
  async def root():
      return {"status": "running", "model": "HeySalad/Cheri-ML-1.3B"}

  @app.get("/health")
  async def health():
      return {"status": "healthy"}

  @app.post("/generate", response_model=GenerateResponse)
  async def generate(request: GenerateRequest):
      try:
          inputs = tokenizer(request.prompt, return_tensors="pt").to(model.device)
          outputs = model.generate(
              **inputs,
              max_new_tokens=request.max_tokens,
              temperature=request.temperature,
              do_sample=True
          )
          generated_text = tokenizer.decode(outputs[0][len(inputs.input_ids[0]):],
   skip_special_tokens=True)
          return GenerateResponse(generated_text=generated_text,
  prompt=request.prompt)
      except Exception as e:
          raise HTTPException(status_code=500, detail=str(e))

  if __name__ == "__main__":
      uvicorn.run(app, host="0.0.0.0", port=8000)
